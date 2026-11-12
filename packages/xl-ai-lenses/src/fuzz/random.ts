/**
 * A random number generator with a seed (mulberry32), so that a failed case
 * can be reproduced. It is the generator of the tests of the text lens:
 * a seed gives the same scenario as before.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** A number from 0 (included) to `n` (not included). */
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}
