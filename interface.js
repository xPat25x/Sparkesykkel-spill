/* Viewport / menu behavior. Game rules live in game.js. */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".game-container");
  const stage = document.querySelector(".game-stage");
  const canvas = document.getElementById("gameCanvas");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const notice = document.getElementById("interfaceNotice");
  let noticeTimer;

  // Use only CSS dimensions. Rotating / resizing never clears the board,
  // changes the player's position, or changes collision coordinates.
  function fitCanvas() {
    const width = Math.min(
      stage.clientWidth,
      (stage.clientHeight * canvas.width) / canvas.height,
    );
    canvas.style.width = `${width}px`;
    canvas.style.height = `${(width * canvas.height) / canvas.width}px`;
  }
  new ResizeObserver(fitCanvas).observe(stage);
  fitCanvas();

  // Use the visual viewport when a mobile keyboard or browser toolbar opens.
  function fitViewport() {
    const viewport = window.visualViewport;
    document.body.style.height = `${viewport ? viewport.height : window.innerHeight}px`;
  }
  window.addEventListener("resize", fitViewport);
  window.visualViewport?.addEventListener("resize", fitViewport);
  fitViewport();

  darkModeToggle.checked = localStorage.getItem("darkMode") === "enabled";
  document.body.classList.toggle("dark-mode", darkModeToggle.checked);
  darkModeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", darkModeToggle.checked);
    localStorage.setItem(
      "darkMode",
      darkModeToggle.checked ? "enabled" : "disabled",
    );
  });

  for (const [buttonId, dialogId] of [
    ["helpBtn", "helpDialog"],
    ["settingsBtn", "settingsDialog"],
  ]) {
    const button = document.getElementById(buttonId);
    const dialog = document.getElementById(dialogId);
    button.addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    });
  }

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.hidden = true;
    }, 3500);
  }
  document.addEventListener("game:data-cleared", () => {
    document.getElementById("settingsDialog").close();
    showNotice("Alle lagrede spilldata er slettet.");
  });
  if (
    document.fullscreenEnabled &&
    document.documentElement.requestFullscreen
  ) {
    fullscreenBtn.hidden = false;
    fullscreenBtn.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        showNotice(
          "Nettleseren kunne ikke åpne fullskjerm. Du kan fortsette å spille her.",
        );
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const label = document.fullscreenElement
        ? "Avslutt fullskjerm"
        : "Åpne fullskjerm";
      fullscreenBtn.setAttribute("aria-label", label);
      fullscreenBtn.title = label;
      fitViewport();
    });
  }

  // Give the existing result / highscore panels keyboard focus and a focus trap.
  // Native dialog is used above; these panels are still created by game.js.
  const panelSelector = ".game-over, .highscore-modal";
  const focusableSelector =
    'button:not([disabled]), input, textarea, select, a[href], [tabindex="0"]';
  const returnFocus = new WeakMap();
  const observer = new MutationObserver((records) => {
    const hasPanel = !!container.querySelector(panelSelector);
    container.classList.toggle("has-panel", hasPanel);
    for (const element of container.querySelectorAll(
      ".game-header, .score-strip, .game-layout",
    )) {
      element.inert = hasPanel;
    }
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.matches(panelSelector)) continue;
        returnFocus.set(node, document.activeElement);
        node.querySelector("button")?.focus({ preventScroll: true });
      }
      for (const node of record.removedNodes) {
        if (node.nodeType !== 1 || !node.matches(panelSelector)) continue;
        const previous = returnFocus.get(node);
        if (previous?.isConnected && !previous.disabled)
          previous.focus({ preventScroll: true });
        else
          document.getElementById("restartBtn").focus({ preventScroll: true });
      }
    }
  });
  observer.observe(container, { childList: true });
  document.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    const panels = document.querySelectorAll(panelSelector);
    const panel = panels[panels.length - 1];
    if (!panel) return;
    if (event.key === "Escape") {
      event.preventDefault();
      panel.remove();
    }
    if (event.key === "Tab") {
      const focusable = [...panel.querySelectorAll(focusableSelector)].filter(
        (el) => el.getClientRects().length,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
});
