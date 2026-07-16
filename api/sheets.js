// api/sheets.js
// Reads data from a Google Sheet and returns it as JSON.
// Sheet must be shared as "Anyone with the link can view".
// Calls: /api/sheets?tab=SheetName  (or ?tab=meta for available tab names)

const SHEET_ID = '1qg4jrZAebVI-6sU4k93jnbJl2TR3ym0nogi5yFhNg6w';
const API_KEY  = process.env.SHEETS_API_KEY || 'AIzaSyDD4n0_tjwI_wKL3XVx61phqzyis7Q6oso';
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { tab } = req.query;

  try {
    // ── Return list of all tab names ──────────────────────
    if (!tab || tab === 'meta') {
      const metaRes = await fetch(
        `${BASE}/${SHEET_ID}?key=${API_KEY}&fields=sheets.properties(title,sheetId,index)`
      );
      const meta = await metaRes.json();
      if (meta.error) throw new Error(meta.error.message);

      const sheets = (meta.sheets || []).map(s => ({
        title:   s.properties.title,
        sheetId: s.properties.sheetId,
        index:   s.properties.index,
      }));

      return res.status(200).json({ sheets });
    }

    // ── Read rows from a named tab ────────────────────────
    const range    = encodeURIComponent(`${tab}!A1:Z500`);
    const valRes   = await fetch(`${BASE}/${SHEET_ID}/values/${range}?key=${API_KEY}`);
    const valData  = await valRes.json();

    if (valData.error) throw new Error(valData.error.message);

    const rows = valData.values || [];
    if (rows.length < 1) return res.status(200).json({ headers: [], rows: [], count: 0 });

    // First row = headers
    const headers = rows[0].map(h => String(h).trim());
    const data    = rows.slice(1)
      .filter(row => row.some(cell => String(cell).trim() !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (row[i] ?? '').toString().trim(); });
        return obj;
      });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      tab,
      headers,
      rows:  data,
      count: data.length,
      fetchedAt: Date.now(),
    });

  } catch (err) {
    console.error('Sheets error:', err.message);
    // Common errors with helpful messages
    const msg = err.message.includes('API key') || err.message.includes('403')
      ? 'Invalid API key or Sheet not shared publicly. Share the sheet as "Anyone with link can view".'
      : err.message;
    return res.status(500).json({ error: msg });
  }
}
