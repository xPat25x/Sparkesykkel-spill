const { test } = require("node:test");
const assert = require("node:assert/strict");
const Clock = require("../loop.js");

test("Clock advances exactly 600 ticks over ten seconds at 30, 60, 120, 144 and 240 Hz", () => {
  for (const hz of [30, 60, 120, 144, 240]) {
    let count = 0;
    const clock = new Clock(() => {
      count++;
    });
    for (let frame = 0; frame <= hz * 10; frame++)
      clock.advance((frame * 1000) / hz);
    assert.equal(count, 600, `${hz} Hz`);
  }
});
test("Reset drops hidden time and a long blocked frame catches up at most six ticks", () => {
  let count = 0;
  const clock = new Clock(() => {
    count++;
  });
  clock.advance(0);
  clock.advance(10000);
  assert.equal(count, 6);
  clock.reset();
  clock.advance(90000);
  assert.equal(count, 6);
  clock.advance(90000 + 1000 / 60);
  assert.equal(count, 7);
});
test("A collision stops further catch-up ticks and invalid timestamps do not poison the clock", () => {
  let count = 0;
  const clock = new Clock(() => {
    count++;
    return false;
  });
  clock.advance(NaN);
  clock.advance(0);
  clock.advance(100);
  assert.equal(count, 1);
  clock.reset();
  clock.advance(0);
  clock.advance(1000 / 60);
  assert.equal(count, 2);
});
