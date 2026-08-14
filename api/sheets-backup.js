// api/sheets-backup.js
// Proxies the full app state to a Google Apps Script Web App.
//
// Google Apps Script Web Apps return a 302 redirect when called externally.
// Standard fetch converts that redirect from POST → GET, calling doGet instead
// of doPost. Fix: use redirect:'manual' to catch the Location header, then
// re-send the payload as POST to the actual execution URL.
//
// Required env var: SHEETS_BACKUP_URL — the deployed Apps Script /exec URL

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  const BACKUP_URL = process.env.SHEETS_BACKUP_URL;
  if (!BACKUP_URL) {
    return res.status(200).json({ ok: false, reason: 'SHEETS_BACKUP_URL not configured' });
  }

  const payload = JSON.stringify({
    ...req.body,
    _by: req.body._by || 'app',
    _ts: Date.now(),
  });

  try {
    // ── Step 1: Hit the /exec URL with redirect:manual to get the real URL ──
    const initial = await fetch(BACKUP_URL, {
      method:  'POST',
      redirect: 'manual',               // catch 302 without following it
      headers: { 'Content-Type': 'text/plain' },
      body:    payload,
    });

    // Apps Script returns 302 → grab Location header
    const execUrl = initial.headers.get('location') || BACKUP_URL;

    // ── Step 2: POST the payload directly to the execution URL ──────────────
    const response = await fetch(execUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    payload,
    });

    const text = await response.text();
    let result;
    try   { result = JSON.parse(text); }
    catch { result = { raw: text.slice(0, 300) }; }

    return res.status(200).json({ ok: result.ok !== false, ...result });

  } catch (err) {
    console.error('sheets-backup error:', err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
