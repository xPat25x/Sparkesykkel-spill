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
            getHighscores, pauseGame, resumeGame, applyPowerUps, createObstacle, createCollectible,
            checkCollision, checkCollectibleCollision,
            get frameCount() { return frameCount; }, get activePowerUps() { return activePowerUps; },
            get score() { return score; }, set score(value) { score = value; },
            get obstacles() { return obstacles; },
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
      let seed = 12345;
      Math.random = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      let timestamp = 1000,
        sequence = 0;
      const pending = new Map();
      window.requestAnimationFrame = (callback) => {
        pending.set(++sequence, callback);
        return sequence;
      };
      window.cancelAnimationFrame = (id) => pending.delete(id);
      window.__stepFrames = (count = 1, delta = 1000 / 60) => {
        for (let n = 0; n < count; n++) {
          timestamp += delta;
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

test("Steering is slower, accelerates gradually and brakes smoothly on release", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  await page.evaluate(() => __stepFrames(2));
  await page.keyboard.down("ArrowRight");
  const moving = await page.evaluate(() => {
    __stepFrames(3);
    const initial = __gameTest.player.speedX;
    __stepFrames(20);
    return { initial, cruising: __gameTest.player.speedX, cap: __gameTest.player.speed };
  });
  assert.equal(moving.cap, 6.5);
  assert.ok(moving.initial > 0 && moving.initial < moving.cruising);
  assert.ok(moving.cruising > 3 && moving.cruising <= moving.cap);
  await page.keyboard.up("ArrowRight");
  const stopping = await page.evaluate(() => {
    const initial = __gameTest.player.speedX;
    __stepFrames(15);
    return { initial, after: __gameTest.player.speedX };
  });
  assert.ok(stopping.after > 0 && stopping.after < stopping.initial * 0.1);
  await finish(page);
});

test("Diagonal steering does not exceed the scooter's speed limit", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  await page.evaluate(() => __stepFrames(2));
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  const speed = await page.evaluate(() => {
    __stepFrames(40);
    const { speedX, speedY, speed: maxSpeed } = __gameTest.player;
    return { magnitude: Math.hypot(speedX, speedY), maxSpeed };
  });
  assert.ok(speed.magnitude <= speed.maxSpeed + 1e-8);
  assert.ok(speed.magnitude > 0);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
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
  assert.equal(
    await page.evaluate(() => localStorage.getItem("soundEnabled")),
    null,
  );
  await finish(page);
});

test("Collision sizes, spawn progression and power-up values are preserved", async () => {
  const original = execFileSync(
    "git",
    ["show", "e601db159374195ec13d72a44fddeeb0712ef5ac:game.js"],
    { cwd: root, encoding: "utf8" },
  );
  const current = await readFile(path.join(root, "game.js"), "utf8");
  for (const [start, end] of [
    ["    function getObstacleType()", "    function createObstacle()"],
    ["    function checkCollision(", "    function clearCanvas("],
    ["    let powerUpTypes =", "    activePowerUps = [];"],
    [
      "    function checkCollectibleCollision(",
      "    function createCollectible()",
    ],
    ["      frameCount++;", "      player.update(keys, speedFactor);"],
  ]) {
    const section = (text) =>
      text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
    assert.ok(original.includes(start) && current.includes(start));
    assert.equal(section(current), section(original), start.trim());
  }
});

test("Pause freezes movement, time and power-ups; resume does not catch up time spent away", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  await page.evaluate(() => __stepFrames(30));
  await page.keyboard.down("ArrowLeft");
  await page.evaluate(() => __stepFrames(10));
  await page.click("#pauseBtn");
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  const snapshot = () =>
    page.evaluate(() => [
      __gameTest.frameCount,
      __gameTest.player.x,
      __gameTest.player.y,
      __gameTest.activePowerUps[0].timeLeft,
    ]);
  const before = await snapshot();
  await page.evaluate(() => __stepFrames(120));
  assert.deepEqual(await snapshot(), before);
  await page.click("#touchUp");
  assert.equal(
    await page.evaluate(() => Object.values(__gameTest.keys).some(Boolean)),
    false,
  );
  await page.click("#settingsBtn");
  assert.equal(
    await page.locator("#settingsDialog").evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.click("#resumeBtn");
  await page.evaluate(() => __stepFrames(2));
  assert.equal((await snapshot())[0], before[0] + 1);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.click("#resumeBtn");
  await page.keyboard.press("p");
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.keyboard.press("p");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  await page.keyboard.press("Space");
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.keyboard.press("Space");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("main").getAttribute("data-state"), "paused");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  await page.keyboard.up("ArrowLeft");
  await finish(page);
});

test("The same two seconds at 30, 60, 120 and 144 Hz give identical game state", async () => {
  const states = [];
  for (const hz of [30, 60, 120, 144]) {
    const page = await open(390, 844, true, true);
    await page.click("#startBtn");
    await page.keyboard.down("ArrowLeft");
    await page.evaluate((hz) => {
      __stepFrames(1);
      __stepFrames(hz * 2, 1000 / hz);
    }, hz);
    states.push(
      await page.evaluate(() => ({
        frames: __gameTest.frameCount,
        x: __gameTest.player.x,
        y: __gameTest.player.y,
        powerUps: __gameTest.activePowerUps.map((p) => [p.type, p.timeLeft]),
        obstacles: __gameTest.obstacles.map((p) => [p.type, p.x, p.y, p.speed]),
        score: __gameTest.score,
        time: document.getElementById("runTime").textContent,
      })),
    );
    await finish(page);
  }
  assert.equal(states[0].frames, 120);
  assert.equal(states[0].time, "0:02");
  for (const state of states.slice(1)) assert.deepEqual(state, states[0]);
});

test("Repeated speed pickups refresh their timer once and never leak into a new round", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  const result = await page.evaluate(() => {
    const pickup = { type: "speed", duration: 2, color: "#FFD54F", icon: "⚡" };
    __gameTest.collectPowerUp(pickup);
    const first = __gameTest.player.speed;
    __gameTest.collectPowerUp(pickup);
    const repeated = __gameTest.player.speed;
    __gameTest.applyPowerUps();
    __gameTest.applyPowerUps();
    const expired = __gameTest.player.speed;
    __gameTest.collectPowerUp(pickup);
    __gameTest.endGame();
    __gameTest.startGame();
    return [first, repeated, expired, __gameTest.player.speed];
  });
  assert.deepEqual(result, [11.7, 11.7, 6.5, 6.5]);
  await finish(page);
});

test("Slow motion refreshes without compounding; old and newly spawned traffic return to baseline", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  const result = await page.evaluate(() => {
    const initial = __gameTest.createObstacle();
    const base = initial.speed;
    __gameTest.obstacles.push(initial);
    const pickup = {
      type: "slowTime",
      duration: 2,
      color: "#9C27B0",
      icon: "⏱️",
    };
    __gameTest.collectPowerUp(pickup);
    const first = initial.speed;
    __gameTest.collectPowerUp(pickup);
    const second = initial.speed;
    const fresh = __gameTest.createObstacle();
    __gameTest.obstacles.push(fresh);
    const freshBaseline = fresh.speed * 1.35;
    __gameTest.applyPowerUps();
    __gameTest.applyPowerUps();
    return [
      base,
      first,
      second,
      initial.speed,
      fresh.speed,
      freshBaseline,
      initial.slowTimeApplied,
      fresh.slowTimeApplied,
    ];
  });
  assert.equal(result[1], result[0] / 1.35);
  assert.equal(result[2], result[1]);
  assert.ok(Math.abs(result[3] - result[0]) < 1e-10);
  assert.equal(result[4], result[5]);
  assert.deepEqual(result.slice(6), [false, false]);
  await finish(page);
});

test("The rendered high-influence scene balances canvas transforms for a whole run", async () => {
  const page = await open(390, 844, true, true);
  await page.evaluate(() => {
    const ctx = document.getElementById("gameCanvas").getContext("2d");
    window.__depth = 0;
    const save = ctx.save.bind(ctx),
      restore = ctx.restore.bind(ctx);
    ctx.save = () => {
      __depth++;
      save();
    };
    ctx.restore = () => {
      __depth--;
      restore();
    };
  });
  await page.click("#startBtn");
  await page.evaluate(() => {
    __gameTest.score = 80;
    __stepFrames(100);
  });
  assert.equal(await page.evaluate(() => __depth), 0);
  assert.equal(await page.locator("#influenceValue").textContent(), "80%");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  await finish(page);
});

test("Broken local records do not prevent opening the leaderboard or saving a new result", async () => {
  const page = await open(390, 844, true, true);
  await page.evaluate(() => localStorage.setItem("highscores", "{broken-json"));
  await page.click("#highscoreBtn");
  assert.equal(await page.locator(".highscore-modal").count(), 1);
  await page.keyboard.press("Escape");
  await page.click("#startBtn");
  await page.evaluate(() => __gameTest.endGame());
  await page.fill("#playerName", "Patrick");
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => __gameTest.getHighscores()[0].name),
    "Patrick",
  );
  await finish(page);
});

test("Audio is off by default and can be enabled, restored and reset", async () => {
  const page = await open();
  await page.click("#settingsBtn");
  assert.equal(
    await page.locator("#soundToggle").getAttribute("aria-pressed"),
    "false",
  );
  await page.click("#soundToggle");
  assert.equal(
    await page.locator("#soundToggle").getAttribute("aria-pressed"),
    "true",
  );
  await page.reload();
  await page.click("#settingsBtn");
  assert.equal(
    await page.locator("#soundToggle").getAttribute("aria-pressed"),
    "true",
  );
  page.on("dialog", (dialog) => {
    if (dialog.type() === "confirm") dialog.accept();
  });
  await page.click("#clearDataBtn");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("soundEnabled")),
    null,
  );
  await finish(page);
});

test("A real collision finishes its animation and the result can start a clean new run", async () => {
  const page = await open(390, 844, true, true);
  await page.click("#startBtn");
  await page.evaluate(() => {
    __gameTest.activePowerUps.length = 0;
    const obstacle = __gameTest.createObstacle();
    obstacle.y = __gameTest.player.y;
    obstacle.x = __gameTest.player.x;
    obstacle.speed = 0;
    __gameTest.obstacles.push(obstacle);
    __stepFrames(3);
  });
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "collision",
  );
  await page.evaluate(() => __stepFrames(240));
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "finished",
  );
  assert.equal(await page.locator(".run-summary").count(), 1);
  await page.click(".result-restart");
  assert.equal(
    await page.locator("main").getAttribute("data-state"),
    "playing",
  );
  assert.equal(await page.evaluate(() => __gameTest.player.speed), 6.5);
  await finish(page);
});
