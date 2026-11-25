// A tiny seeded random generator (mulberry32) so a fixed seed always replays the
// same shift: the same tickets, the same spawn jitter, the same screenshots.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from a seeded generator. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one entry from a list with a seeded generator. */
export function randomPick(random, list) {
  return list[Math.floor(random() * list.length)];
}
