/* One simulation tick is always 1/60 second, regardless of display refresh rate. */
(function (root) {
  class FixedStepClock {
    constructor(step, fps = 60) {
      this.step = step;
      this.interval = 1000 / fps;
      this.reset();
    }
    reset() {
      this.previous = null;
      this.accumulator = 0;
    }
    advance(timestamp) {
      if (!Number.isFinite(timestamp)) return 0;
      if (this.previous === null) {
        this.previous = timestamp;
        return 0;
      }
      // At most six ticks of catch-up. Background tabs are paused separately.
      this.accumulator += Math.max(0, Math.min(100, timestamp - this.previous));
      this.previous = timestamp;
      let count = 0;
      while (this.accumulator + 1e-7 >= this.interval) {
        this.accumulator -= this.interval;
        count++;
        if (this.step() === false) {
          this.accumulator = 0;
          break;
        }
      }
      return count;
    }
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = FixedStepClock;
  else root.DeathtripClock = FixedStepClock;
})(globalThis);
