// api/send-email.js — Send influencer payment reminder via Resend
// Requires RESEND_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ error: 'RESEND_API_KEY not set in Vercel environment variables.' });
  }

  const { influencerName, instagramHandle, fee, payDate, addedBy } = req.body || {};

  const subject = `💰 Influencer Payment Due: ${influencerName || instagramHandle} — $${fee?.toLocaleString()}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <div style="background:#046c5e;color:#fff;border-radius:10px 10px 0 0;padding:20px 24px">
        <div style="font-size:18px;font-weight:600">Influencer Payment Reminder</div>
        <div style="font-size:13px;opacity:.8;margin-top:4px">Solve Marketing OS</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <p style="margin:0 0 16px;font-size:14px;color:#374151">Hey Jayson,</p>
        <p style="margin:0 0 16px;font-size:14px;color:#374151">
          <strong>${influencerName || instagramHandle}</strong> has been marked <strong style="color:#dc2626">Needs to be paid</strong> in the influencer pipeline.
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:13px;color:#6b7280">Influencer</span>
            <span style="font-size:13px;font-weight:500">${influencerName || instagramHandle}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:13px;color:#6b7280">Instagram</span>
            <span style="font-size:13px;font-weight:500">${instagramHandle || '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:13px;color:#6b7280">Amount due</span>
            <span style="font-size:15px;font-weight:700;color:#046c5e">$${fee?.toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:13px;color:#6b7280">Pay by</span>
            <span style="font-size:13px;font-weight:500">${payDate}</span>
          </div>
        </div>
        <p style="margin:0;font-size:12px;color:#9ca3af">Marked by ${addedBy || 'Aspen'} · Solve Marketing OS</p>
      </div>
    </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Solve Marketing OS <onboarding@resend.dev>',
        to: ['jayson@solveallpest.com'],
        cc: ['aspen@solveallpest.com'],
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(200).json({ error: data.message || 'Resend API error', data });
    }
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
