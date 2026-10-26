const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
let server, browser, origin;
const diagnostics = new WeakMap();
before(async () => {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const filename = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!filename.startsWith(root + path.sep))
        throw new Error("Invalid path");
      let body = await readFile(filename);
      if (pathname === "/game.js") {
        // Test-only access: the deployed game contains no debug API.
        body = body.toString().replace(
          "    setupTouchControls();",
          `
          window.__gameTest = { keys, player, startGame, endGame, collectPowerUp,
            getHighscores, get obstacles() { return obstacles; },
            get collectibles() { return collectibles; } };
          setupTouchControls();`,
        );
      }
      const mime = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
      };
      response.writeHead(200, {
        "Content-Type":
          mime[path.extname(filename)] || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function open(
  width = 390,
  height = 844,
  touch = true,
  deterministic = false,
) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: touch,
    hasTouch: touch,
  });
  if (deterministic) {
    await context.addInitScript(() => {
      let timestamp = 1000,
        sequence = 0;
      const pending = new Map();
      window.requestAnimationFrame = (callback) => {
        pending.set(++sequence, callback);
        return sequence;
      };
      window.cancelAnimationFrame = (id) => pending.delete(id);
      window.__stepFrames = (count = 1) => {
        for (let n = 0; n < count; n++) {
          timestamp += 1000 / 60;
          const callbacks = [...pending.values()];
          pending.clear();
          for (const callback of callbacks) callback(timestamp);
        }
      };
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("dialog", (dialog) => {
    if (dialog.type() === "alert") {
      errors.push(dialog.message());
      dialog.dismiss();
    }
  });
  diagnostics.set(page, errors);
  await page.goto(origin);
  await page.waitForFunction(
    () => window.__gameTest && document.querySelector("canvas").style.width,
  );
  return page;
}
async function finish(page) {
  const errors = diagnostics.get(page);
  await page.context().close();
  assert.deepEqual(errors, [], "No browser errors or missing assets");
}
async function layout(page, touch = true) {
  const metrics = await page.evaluate((touch) => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const selectors = [
      "#gameCanvas",
      document.querySelector("main").dataset.state === "ready"
        ? "#startBtn"
        : "#highscoreBtn",
      "#powerupContainer",
      ...(touch ? ["#touchUp", "#touchDown", "#touchLeft", "#touchRight"] : []),
    ];
    return {
      viewport: [innerWidth, innerHeight],
      scroll: [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ],
      board: [gameCanvas.width, gameCanvas.height],
      elements: selectors.map((selector) => ({
        selector,
        ...rect(document.querySelector(selector)),
      })),
    };
  }, touch);
  assert.ok(
    metrics.scroll[0] <= metrics.viewport[0] + 1,
    "No horizontal scrolling",
  );
  assert.ok(
    metrics.scroll[1] <= metrics.viewport[1] + 1,
    "No vertical scrolling",
  );
  assert.deepEqual(metrics.board, [800, 600]);
  for (const box of metrics.elements) {
    assert.ok(box.width > 0 && box.height > 0, `${box.selector} is visible`);
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.right <= metrics.viewport[0] + 1 &&
        box.bottom <= metrics.viewport[1] + 1,
      `${box.selector} fits the screen`,
    );
    if (box.selector.startsWith("#touch"))
      assert.ok(
        box.width >= 44 && box.height >= 44,
        "Touch targets are at least 44 × 44",
      );
  }
  const canvas = metrics.elements[0];
  assert.ok(
    Math.abs(canvas.width / canvas.height - 4 / 3) < 0.01,
    "The road is never stretched",
  );
}

const screens = [
  [320, 568, true],
  [360, 640, true],
  [375, 667, true],
  [390, 844, true],
  [412, 915, true],
  [568, 320, true],
  [667, 375, true],
  [844, 390, true],
  [915, 412, true],
  [768, 1024, true],
  [1024, 768, true],
  [1280, 480, false],
  [1280, 720, false],
  [1440, 900, false],
  [1920, 1080, false],
];
for (const [width, height, touch] of screens) {
  test(`Road and controls fit ${width} × ${height} (${touch ? "touch" : "desktop"})`, async () => {
    const page = await open(width, height, touch, true);
    try {
      await layout(page, touch);
      await page.click("#startBtn");
      await page.evaluate(() => __stepFrames(3));
      await layout(page, touch);
    } finally {
      await finish(page);
    }
  });
}

test("A held pointer starts the game; sliding, cancellation and focus loss release the right keys", async () => {
  const page = await open(390, 844, true, true);
  const left = await page.locator("#touchLeft").boundingBox();
  const right = await page.locator("#touchRight").boundingBox();
  await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await page.mouse.down();
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  assert.equal(await page.evaluate(() => __gameTest.keys.ArrowLeft), true);
  await page.evaluate(() => __stepFrames(20));
  assert.ok(await page.evaluate(() => __gameTest.player.x < 400));
  await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
  assert.deepEqual(
    await page.evaluate(() => [
      __gameTest.keys.ArrowLeft,
      __gameTest.keys.ArrowRight,
    ]),
    [false, true],
  );
  await page.mouse.up();
  assert.equal(
    await page.evaluate(() => Object.values(__gameTest.keys).some(Boolean)),
    false,
  );
  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    await page.evaluate(() => Object.values(__gameTest.keys).some(Boolean)),
    false,
  );
  assert.equal(await page.locator(".touch-button.is-held").count(), 0);
  await page.mouse.up();
  await finish(page);
});

test("Two real touch points support diagonals and releasing one keeps the other direction", async () => {
  const page = await open(390, 844, true, true);
  const session = await page.context().newCDPSession(page);
  const points = [];
  for (const [index, id] of ["#touchUp", "#touchRight"].entries()) {
    const box = await page.locator(id).boundingBox();
    points.push({
      id: index + 1,
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points,
  });
  assert.deepEqual(
    await page.evaluate(() => [
      __gameTest.keys.ArrowUp,
      __gameTest.keys.ArrowRight,
    ]),
    [true, true],
  );
  await page.evaluate(() => __stepFrames(20));
  assert.ok(
    await page.evaluate(
      () => __gameTest.player.x > 400 && __gameTest.player.y < 500,
    ),
  );
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [points[0]],
  });
  assert.deepEqual(
    await page.evaluate(() => [
      __gameTest.keys.ArrowUp,
      __gameTest.keys.ArrowRight,
    ]),
    [false, true],
  );
  await session.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  assert.equal(
    await page.evaluate(() => Object.values(__gameTest.keys).some(Boolean)),
    false,
  );
  await finish(page);
});

test("Keyboard controls, initial entities and rotation keep finite, unchanged game coordinates", async () => {
  const page = await open(390, 844, true, true);
  await page.keyboard.press("Enter");
  await page.evaluate(() => __stepFrames(3));
  assert.equal(
    await page.evaluate(() =>
      [
        __gameTest.player,
        ...__gameTest.obstacles,
        ...__gameTest.collectibles,
      ].every((o) => Number.isFinite(o.x) && Number.isFinite(o.y)),
    ),
    true,
  );
  await page.keyboard.down("ArrowLeft");
  await page.evaluate(() => __stepFrames(20));
  await page.keyboard.up("ArrowLeft");
  const before = await page.evaluate(() => [
    __gameTest.player.x,
    __gameTest.player.y,
    gameCanvas.width,
    gameCanvas.height,
  ]);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => [
    __gameTest.player.x,
    __gameTest.player.y,
    gameCanvas.width,
    gameCanvas.height,
  ]);
  assert.deepEqual(after, before, "Rotation changes only CSS dimensions");
  await page.keyboard.down("D");
  await page.evaluate(() => __stepFrames(20));
  await page.keyboard.up("D");
  assert.ok(await page.evaluate((x) => __gameTest.player.x > x, before[0]));
  // Space used to call an undefined togglePause function.
  await page.keyboard.press("Space");
  await finish(page);
});

test("Power-up collection still works and uses the original duration and speed rules", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  const result = await page.evaluate(() => {
    const speed = __gameTest.player.speed;
    __gameTest.collectPowerUp({
      type: "speed",
      duration: 240,
      color: "#ff0",
      icon: "⚡",
    });
    return [speed, __gameTest.player.speed];
  });
  assert.equal(result[1], result[0] * 1.8);
  assert.match(
    await page.locator("#powerupContainer").textContent(),
    /Fart|Hastighet/,
  );
  await finish(page);
});

test("Help and settings are keyboard accessible; the saved theme restores after reload", async () => {
  const page = await open();
  await page.click("#helpBtn");
  assert.equal(
    await page.locator("#helpDialog").evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#helpDialog").evaluate((el) => el.open),
    false,
  );
  await page.click("#settingsBtn");
  await page.check("#darkModeToggle");
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("dark-mode")),
    true,
  );
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("dark-mode")),
    true,
  );
  await page.click("#settingsBtn");
  assert.equal(await page.isChecked("#darkModeToggle"), true);
  await page.keyboard.press("Escape");
  await page.click("#highscoreBtn");
  assert.equal(await page.locator(".highscore-modal").count(), 1);
  assert.equal(
    await page.evaluate(() => document.querySelector(".game-layout").inert),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".highscore-modal").count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "highscoreBtn",
  );
  await finish(page);
});

test("Results fit small screens; typing and Enter save a name without restarting", async () => {
  const page = await open(320, 568, true, true);
  await page.click("#startBtn");
  await page.evaluate(() => __gameTest.endGame());
  await page.waitForSelector(".game-over");
  assert.notEqual(
    await page.evaluate(() => document.activeElement.id),
    "playerName",
    "Do not force open the mobile keyboard",
  );
  await page.fill("#playerName", "Patrick WASD");
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "finished",
  );
  const scores = await page.evaluate(() => __gameTest.getHighscores());
  assert.equal(scores[0].name, "Patrick WASD");
  const metrics = await page.locator(".game-over").evaluate((el) => ({
    top: el.getBoundingClientRect().top,
    bottom: el.getBoundingClientRect().bottom,
    viewport: innerHeight,
  }));
  assert.ok(metrics.top >= 0 && metrics.bottom <= metrics.viewport);
  await page.keyboard.press("Escape");
  await page.click("#restartBtn");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  await finish(page);
});

test("Reset clears the advertised data and restores the visible theme", async () => {
  const page = await open();
  await page.evaluate(() => {
    localStorage.setItem("playerName", "Patrick");
    localStorage.setItem("highScore", "50");
    localStorage.setItem("highscores", '[{"name":"Patrick","score":50}]');
    localStorage.setItem("darkMode", "enabled");
  });
  await page.reload();
  await page.click("#settingsBtn");
  page.on("dialog", (dialog) => {
    if (dialog.type() === "confirm") dialog.accept();
  });
  await page.click("#clearDataBtn");
  assert.deepEqual(
    await page.evaluate(() => [
      localStorage.getItem("playerName"),
      localStorage.getItem("highScore"),
      localStorage.getItem("darkMode"),
      localStorage.getItem("highscores"),
    ]),
    [null, null, null, "[]"],
  );
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("dark-mode")),
    false,
  );
  assert.equal(await page.locator("#interfaceNotice").isVisible(), true);
  await finish(page);
});

test("Original physics, collision, obstacle, scoring and power-up implementation is preserved", async () => {
  const original = execFileSync(
    "git",
    ["show", "93c97195f5964c85f734f10064e01703d5775e6b:game.js"],
    { cwd: root, encoding: "utf8" },
  );
  const current = await readFile(path.join(root, "game.js"), "utf8");
  for (const [start, end] of [
    ["    const player = {", "    function getObstacleType()"],
    ["    function getObstacleType()", "    function shadeColor("],
    ["    function checkCollision(", "    function clearCanvas("],
    [
      "    function applyDrunkScreenEffects()",
      "    function runCollisionAnimation(",
    ],
    ["    function collectPowerUp(", "    function drawWeatherEffects("],
  ]) {
    const section = (source) =>
      source.slice(source.indexOf(start), source.indexOf(end));
    assert.ok(original.includes(start) && current.includes(start));
    assert.equal(
      section(current),
      section(original),
      `${start.trim()} retains the original implementation`,
    );
  }
});
