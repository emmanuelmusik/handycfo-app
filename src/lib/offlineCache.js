// Read-only offline copy of the user's records. Stored on the device only.
const PREFIX = 'handycfo:cache:';

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    window.dispatchEvent(new Event('handycfo:cache'));
  } catch { /* storage full or blocked: skip */ }
}

export function clearCache() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function lastCachedAt() {
  let latest = 0;
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => {
      const v = JSON.parse(localStorage.getItem(k) || '{}');
      if (v.at > latest) latest = v.at;
    });
  } catch { /* ignore */ }
  return latest;
}
