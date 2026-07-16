// Vercel serverless function — GoHighLevel marketing data proxy
// Focused on newsletters, affiliates, and contact growth

const LOC  = 'LdS5BOEygD0rDPNjJ1GX';
const KEY  = 'pit-1357d634-3862-4df3-9495-90cfbe80c2ac';
const BASE = 'https://services.leadconnectorhq.com';
const HDR  = {
  'Authorization': `Bearer ${KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
};

// Update these tags to match what you use in GHL
const NEWSLETTER_TAG = 'Newsletter';
const AFFILIATE_TAG  = 'Affiliate';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { ep } = req.query;

  try {
    if (ep === 'summary') {
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

      const [allRes, monthRes, emailRes] = await Promise.all([
        // All contacts (for total count)
        fetch(`${BASE}/contacts/?locationId=${LOC}&limit=1`, { headers: HDR }),
        // New contacts this month
        fetch(`${BASE}/contacts/?locationId=${LOC}&limit=100&startAfter=${monthStart.getTime()}`, { headers: HDR }),
        // Email campaigns (newsletter stats)
        fetch(`${BASE}/campaigns/?locationId=${LOC}&status=published&limit=20`, { headers: HDR }),
      ]);

      const [allData, monthData, emailData] = await Promise.all([
        allRes.json(), monthRes.json(), emailRes.json(),
      ]);

      // Fetch newsletter-tagged contacts and affiliate-tagged contacts separately
      const [nlRes, affRes] = await Promise.all([
        fetch(`${BASE}/contacts/?locationId=${LOC}&limit=1&tags[]=${encodeURIComponent(NEWSLETTER_TAG)}`, { headers: HDR }),
        fetch(`${BASE}/contacts/?locationId=${LOC}&limit=1&tags[]=${encodeURIComponent(AFFILIATE_TAG)}`, { headers: HDR }),
      ]);
      const [nlData, affData] = await Promise.all([nlRes.json(), affRes.json()]);

      // Email campaigns — extract most recent with stats
      const campaigns = (emailData.campaigns || []).slice(0, 5).map(c => ({
        name:      c.name || c.title || 'Campaign',
        status:    c.status || 'sent',
        sentCount: c.stats?.sent    || c.sentCount    || 0,
        openRate:  c.stats?.openRate || c.openRate    || 0,
        clickRate: c.stats?.clickRate || c.clickRate  || 0,
        sentDate:  c.updatedAt || c.createdAt || null,
      }));

      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({
        totalContacts:     allData.meta?.total   || 0,
        newThisMonth:      (monthData.contacts   || []).length,
        newsletterContacts: nlData.meta?.total   || 0,
        affiliateContacts: affData.meta?.total   || 0,
        campaigns,
        fetchedAt: Date.now(),
      });
    }

    return res.status(400).json({ error: `Unknown endpoint: ${ep}` });

  } catch (err) {
    console.error('GHL proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
