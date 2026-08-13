// api/sheets-backup.js
// Proxies the full app state to a Google Apps Script Web App
// that writes it to a Google Sheet (multi-tab backup).
//
// Required env var:  SHEETS_BACKUP_URL  — the deployed Apps Script Web App URL
// Optional env var:  SHEETS_BACKUP_SECRET — a shared token for basic auth

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  const BACKUP_URL = process.env.SHEETS_BACKUP_URL;
  if (!BACKUP_URL) {
    // Return 200 so the client doesn't think it errored — just silently skip
    return res.status(200).json({ ok: false, reason: 'SHEETS_BACKUP_URL not configured' });
  }

  try {
    // Forward the payload to the Apps Script Web App
    // Apps Script returns a 302 redirect; follow it server-side (no CORS issue)
    const response = await fetch(BACKUP_URL, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' }, // text/plain avoids preflight on GAS
      body:     JSON.stringify({
        ...req.body,
        _meta: {
          ts:      Date.now(),
          updater: req.body._by || 'app',
        },
      }),
    });

    const text = await response.text();
    let result;
    try   { result = JSON.parse(text); }
    catch { result = { raw: text }; }

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('sheets-backup error:', err.message);
    return res.status(200).json({ ok: false, error: err.message }); // 200 so client stays quiet
  }
}
