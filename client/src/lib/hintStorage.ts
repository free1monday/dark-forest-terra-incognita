/** localStorage helpers for Stage 13 contextual hints (no DB). */

const SEEN_KEY = 'darkforest_hints_seen_v1';
const BOOT_DONE_KEY = 'darkforest_hints_boot_v1';

function key(civId: string, base: string) {
  return `${base}:${civId}`;
}

export function readSeenHints(civId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(civId, SEEN_KEY));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function writeSeenHints(civId: string, seen: Set<string>) {
  try {
    localStorage.setItem(key(civId, SEEN_KEY), JSON.stringify([...seen]));
  } catch {
    /* ignore quota */
  }
}

export function markHintSeen(civId: string, hintId: string): Set<string> {
  const s = readSeenHints(civId);
  s.add(hintId);
  writeSeenHints(civId, s);
  return s;
}

export function isBootHintsDone(civId: string): boolean {
  try {
    return localStorage.getItem(key(civId, BOOT_DONE_KEY)) === '1';
  } catch {
    return false;
  }
}

export function setBootHintsDone(civId: string) {
  try {
    localStorage.setItem(key(civId, BOOT_DONE_KEY), '1');
  } catch {
    /* ignore */
  }
}
