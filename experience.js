/* UI feedback and opt-in procedural audio; no movement, spawn or score rules. */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".game-container");
  const scoreDisplay = document.getElementById("score");
  const runTime = document.getElementById("runTime");
  const influence = document.getElementById("influenceValue");
  const meter = document.getElementById("influenceMeter");
  const message = document.getElementById("pickupMessage");
  const pauseButton = document.getElementById("pauseBtn");
  const soundButton = document.getElementById("soundToggle");
  let lastScore = 0;
  let recordShown = false;
  let messageTimeout;
  let audio;
  let soundEnabled = localStorage.getItem("soundEnabled") === "true";

  function updateSoundButton() {
    soundButton.textContent = soundEnabled ? "På" : "Av";
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    soundButton.setAttribute(
      "aria-label",
      soundEnabled ? "Slå av lydeffekter" : "Slå på lydeffekter",
    );
  }
  function tone(kind) {
    if (!soundEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("No audio support");
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const notes = {
        start: [440, 660],
        score: [660],
        pickup: [660, 880],
        record: [660, 880, 1100],
        crash: [160, 95],
      }[kind];
      for (const [index, frequency] of notes.entries()) {
        const at = audio.currentTime + index * 0.065;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.035, at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.12);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      }
    } catch {
      soundEnabled = false;
      updateSoundButton();
      soundButton.title = "Nettleseren støtter ikke disse lydeffektene.";
    }
  }
  updateSoundButton();
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) tone("pickup");
    localStorage.setItem("soundEnabled", String(soundEnabled));
    updateSoundButton();
  });
  document.addEventListener("game:data-cleared", () => {
    soundEnabled = false;
    audio?.suspend().catch(() => {});
    updateSoundButton();
  });
  function feedback(label, color, record = false) {
    clearTimeout(messageTimeout);
    message.textContent = label;
    message.style.setProperty("--feedback-color", color);
    message.classList.toggle("is-record", record);
    message.hidden = false;
    messageTimeout = setTimeout(
      () => {
        message.hidden = true;
      },
      record ? 2200 : 1400,
    );
  }
  document.addEventListener("game:state", ({ detail }) => {
    const paused = detail.state === "paused";
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.setAttribute(
      "aria-label",
      paused ? "Fortsett spillet" : "Sett spillet på pause",
    );
    pauseButton.innerHTML = paused
      ? '<span aria-hidden="true">▷</span> Fortsett'
      : '<span aria-hidden="true">Ⅱ</span> Pause';
    if (["finished", "collision"].includes(detail.state)) message.hidden = true;
    if (detail.state === "collision")
      document.querySelector(".running-message").textContent = "Turen er over";
  });
  document.addEventListener("game:start", () => {
    lastScore = 0;
    recordShown = false;
    message.hidden = true;
    tone("start");
  });
  document.addEventListener("game:progress", ({ detail }) => {
    const minutes = Math.floor(detail.seconds / 60);
    runTime.textContent = `${minutes}:${String(detail.seconds % 60).padStart(2, "0")}`;
    influence.textContent = `${detail.influence}%`;
    meter.setAttribute("aria-valuenow", String(detail.influence));
    meter.firstElementChild.style.width = `${detail.influence}%`;
    document.querySelector(".influence-status").dataset.level =
      detail.influence >= 70 ? "high" : "normal";
    if (detail.score > lastScore && container.dataset.state === "playing") {
      scoreDisplay.classList.remove("score-pop");
      void scoreDisplay.offsetWidth;
      scoreDisplay.classList.add("score-pop");
      if (!recordShown && detail.score > detail.record) {
        recordShown = true;
        feedback("Ny personlig rekord!", "#ffd700", true);
        tone("record");
      } else tone("score");
    }
    lastScore = detail.score;
  });
  document.addEventListener("game:pickup", ({ detail }) => {
    feedback(
      detail.type === "points" ? "+10 bonuspoeng" : `${detail.label} aktivert`,
      detail.color,
    );
    tone("pickup");
  });
  document.addEventListener("game:crash", () => tone("crash"));
});
