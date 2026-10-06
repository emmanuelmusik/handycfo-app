// Remembers (on this device) that the person agreed to let HandyCFO open the camera / photo
// gallery / file picker. Asked once, before the first picker opens; can be withdrawn in Settings.
const KEY = 'handycfo.mediaConsent.v1';

export function hasMediaConsent() {
  try { return localStorage.getItem(KEY) === 'granted'; } catch { return false; }
}
export function grantMediaConsent() {
  try { localStorage.setItem(KEY, 'granted'); } catch { /* storage unavailable: asked again next time */ }
}
export function withdrawMediaConsent() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
