// Update check for the iPhone/Android app. The app asks "is there a newer web bundle?" and
// this answers with the file to download. Nothing about the person is sent or stored.
import manifest from './_manifest.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const body = (req.method === 'POST' && req.body && typeof req.body === 'object') ? req.body : {};
  const build = parseInt(body.version_code || '0', 10) || 0;

  // Nothing published, or this installed app is older than the native code the bundle needs.
  if (!manifest.version || !manifest.url || !manifest.checksum || build < (manifest.minBuild || 0)) {
    return res.status(200).json({ message: 'No new version available', error: 'no_new_version_available' });
  }
  return res.status(200).json({ version: manifest.version, url: manifest.url, checksum: manifest.checksum });
}
