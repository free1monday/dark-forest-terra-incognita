/**
 * Seeded RNG utilities.
 * xmur3 hash + mulberry32 PRNG — deterministic across client/server.
 */

/** Hash string to 32-bit seed (xmur3). */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32: returns fn() => [0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create RNG from civilization seed + action channel + nonce. */
export function createActionRng(
  civSeed: string,
  actionType: string,
  nonce: number
): () => number {
  const seed = hashString(`${civSeed}::${actionType}::${nonce}`);
  return mulberry32(seed);
}

/** Pick index from weighted table. weights must be > 0. */
export function weightedPick(rng: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** Random int in [min, max] inclusive. */
export function rngInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element from array. */
export function rngPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Generate a readable seed string. */
export function generateSeed(extra = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return hashString(`${t}-${r}-${extra}`).toString(16).padStart(8, '0') + r;
}
