// api/clicki.js — Clicki affiliate stats proxy
// Requires CLICKI_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.CLICKI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ error: 'CLICKI_API_KEY not set in Vercel environment variables.', data: null });
  }

  const { promoterId, promoterEmail, promoCode } = req.body || {};

  try {
    // ── TODO: Replace with real Clicki endpoint once confirmed ──────────────
    // Common patterns to try:
    //   GET /api/v1/promoters/{id}/stats
    //   GET /api/v1/referrals?promoter={id}
    //   GET /api/v1/transactions?promoter={id}
    // Auth header is typically: Authorization: Bearer {key}  OR  X-API-Key: {key}
    // ────────────────────────────────────────────────────────────────────────

    const BASE = 'https://v2.clicki.io';

    // Try to fetch by promo code first, then email, then promoter ID
    const identifier = promoCode || promoterEmail || promoterId;
    if (!identifier) return res.status(400).json({ error: 'Provide promoterId, promoterEmail, or promoCode' });

    const response = await fetch(`${BASE}/api/v1/promoters/stats?identifier=${encodeURIComponent(identifier)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(200).json({
        error: `Clicki API returned ${response.status}`,
        raw: body.slice(0, 300),
        data: null,
      });
    }

    const json = await response.json();

    // Normalize response into the shape the app expects
    // Adjust field names once real API response is confirmed
    const data = {
      clicks:     json.clicks      ?? json.click_count    ?? json.total_clicks    ?? 0,
      conversions:json.conversions ?? json.referral_count  ?? json.total_referrals ?? 0,
      commission: json.commission  ?? json.earnings        ?? json.total_earnings  ?? json.amount ?? 0,
      raw: json,
    };

    return res.status(200).json({ data, error: null });

  } catch (err) {
    console.error('Clicki proxy error:', err);
    return res.status(200).json({ error: err.message, data: null });
  }
}
