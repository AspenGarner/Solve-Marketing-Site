// api/kpi-report.js — AI-generated KPI insight summary
// Requires ANTHROPIC_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      insights: [
        'Add ANTHROPIC_API_KEY to your Vercel environment variables to enable AI-generated insights.',
        'In Vercel dashboard → Settings → Environment Variables → add ANTHROPIC_API_KEY.',
        'Then redeploy. The report data above is calculated live from your Marketing OS data.',
      ].join('\n\n'),
      fallback: true,
    });
  }

  try {
    const { kpiData, quarter } = req.body || {};
    if (!kpiData) return res.status(400).json({ error: 'Missing kpiData' });

    const prompt = `You are a marketing analytics expert reviewing KPI data for Solve All Pest, a residential and commercial pest control company based in Utah. Their marketing team manages influencer partnerships, social media content, email newsletters, community events, and local partnerships.

Analyze the following ${quarter} marketing performance data and provide 4-5 clear, actionable insights. For each insight: state what the data shows, why it matters for a pest control/home services company, and one specific next step. Keep each insight to 2-3 sentences. Be direct and specific about the numbers.

KPI DATA:
${JSON.stringify(kpiData, null, 2)}

Format your response as numbered insights (1. 2. 3. etc.) with no extra headers. Focus on what's working, what needs attention, and where the biggest opportunities are heading into the next quarter.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic API ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const insights = data.content?.[0]?.text || 'No insights generated.';
    return res.status(200).json({ insights, fallback: false });

  } catch (err) {
    console.error('KPI report error:', err);
    return res.status(200).json({
      insights: `Analytics summary unavailable: ${err.message}. Check that ANTHROPIC_API_KEY is set correctly in Vercel environment variables.`,
      fallback: true,
      error: err.message,
    });
  }
}
