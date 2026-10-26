/* Presentation only: the playfield, spawn lanes and hitboxes stay in game.js. */
window.DeathtripScene = (() => {
  let asphalt;
  function roadTexture(ctx) {
    if (!asphalt) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 96;
      const pen = tile.getContext("2d");
      for (let i = 0; i < 180; i++) {
        // Deterministic grain never consumes the game's random sequence.
        pen.fillStyle = i % 3 ? "#ffffff0a" : "#00000012";
        pen.fillRect((i * 37) % 96, (i * 53) % 96, 1, 1);
      }
      asphalt = ctx.createPattern(tile, "repeat");
    }
    return asphalt;
  }
  function drawRoad(ctx, { width, height, frame, drunk, distortion }) {
    const road = width * 0.85;
    const left = (width - road) / 2;
    const sidewalk = Math.min(40, left * 0.8);
    const offset = frame % 80;
    const wave = (y, phase = 0) =>
      drunk > 0.2 ? Math.sin(y * 0.02 + frame * 0.05 + phase) * distortion : 0;
    const edge = (x, phase, reverse = false) => {
      for (let i = 0; i <= Math.ceil(height / 15); i++) {
        const y = reverse
          ? Math.max(0, height - i * 15)
          : Math.min(height, i * 15);
        ctx.lineTo(x + wave(y, phase), y);
      }
    };
    ctx.save();
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(0, 0, width, height);
    // Verge details are outside the existing sidewalks, never obstacles.
    for (let y = (frame % 150) - 150; y < height + 40; y += 150) {
      for (const x of [9, width - 9]) {
        ctx.fillStyle = "#00000020";
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 6, 8, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2e7d32";
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#66bb6a";
        ctx.beginPath();
        ctx.arc(x - 2, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Paved sidewalks move at the same rate as the original center markings.
    ctx.fillStyle = "#d7d9d5";
    ctx.beginPath();
    ctx.moveTo(left - sidewalk + wave(0), 0);
    edge(left, 0);
    edge(left - sidewalk, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(left + road + wave(0, 1), 0);
    edge(left + road + sidewalk, 1);
    edge(left + road, 1, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#00000022";
    ctx.lineWidth = 1;
    for (let y = (frame % 58) - 58; y < height; y += 58) {
      ctx.beginPath();
      ctx.moveTo(left - sidewalk + wave(y), y);
      ctx.lineTo(left + wave(y), y);
      ctx.moveTo(left + road + wave(y, 1), y);
      ctx.lineTo(left + road + sidewalk + wave(y, 1), y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(left + wave(0), 0);
    edge(left, 0);
    edge(left + road, 1, true);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const surface = ctx.createLinearGradient(left, 0, left + road, 0);
    surface.addColorStop(0, "#858985");
    surface.addColorStop(0.14, "#989c98");
    surface.addColorStop(0.5, "#9e9e9e");
    surface.addColorStop(0.86, "#989c98");
    surface.addColorStop(1, "#858985");
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = roadTexture(ctx);
    ctx.fillRect(0, 0, width, height);
    // The center line keeps its original dimensions and movement.
    ctx.fillStyle = "#fff";
    for (let y = offset - 80; y < height; y += 80) {
      ctx.fillRect(width / 2 - 5 + wave(y, 0.5) * 0.7, y, 10, 40);
    }
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffc107";
    for (const [x, phase] of [
      [left, 0],
      [left + road, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x + wave(0, phase), 0);
      edge(x, phase);
      ctx.stroke();
      for (let y = (frame % 120) - 120; y < height; y += 120) {
        const direction = x === left ? -1 : 1;
        ctx.fillStyle = "#ffffffb3";
        ctx.fillRect(x + wave(y, phase) + direction * 8 - 2, y, 4, 10);
      }
    }
    ctx.restore();
  }
  function drawPickup(ctx, item) {
    const radius = item.width / 2;
    ctx.save();
    ctx.translate(item.x, item.y + Math.sin(item.animationPhase) * 3);
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#111b10";
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    if (item.type === "shield") {
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, -6);
      ctx.lineTo(7, 3);
      ctx.quadraticCurveTo(4, 8, 0, 10);
      ctx.quadraticCurveTo(-4, 8, -7, 3);
      ctx.lineTo(-8, -6);
      ctx.closePath();
      ctx.stroke();
    } else if (item.type === "speed") {
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(-7, 2);
      ctx.lineTo(0, 2);
      ctx.lineTo(-2, 11);
      ctx.lineTo(8, -2);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === "slowTime") {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 0);
      ctx.lineTo(4, 3);
      ctx.stroke();
    } else {
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+10", 0, 1);
    }
    ctx.restore();
  }
  const symbols = {
    shield: '<path d="M12 3 20 6l-1 9c-1 3-4 5-7 7-3-2-6-4-7-7L4 6Z"/>',
    speed: '<path d="m14 2-10 12h7l-1 8 10-12h-7Z"/>',
    slowTime: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l5 3"/>',
    points: '<path d="M7 8v8M3 12h8M16 7h3v10h-3"/>',
  };
  function icon(type) {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[type] || symbols.points}</svg>`;
  }
  return { drawRoad, drawPickup, icon };
})();
