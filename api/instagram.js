// api/instagram.js
// Returns live Instagram Business Account data for the KPI dashboard.
// Requires: INSTAGRAM_PAGE_TOKEN and INSTAGRAM_BUSINESS_ID env vars.
// Set them by running through /api/instagram/auth once.

const GRAPH = 'https://graph.facebook.com/v19.0';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const token = process.env.INSTAGRAM_PAGE_TOKEN;
  const igId  = process.env.INSTAGRAM_BUSINESS_ID;

  // Not yet configured — return a helpful status instead of an error
  if (!token || !igId) {
    return res.status(200).json({
      configured: false,
      message: 'Visit /api/instagram/auth to connect your Instagram account',
    });
  }

  try {
    const [profileRes, insightsRes, mediaRes] = await Promise.all([
      // Profile: followers, media count, username
      fetch(`${GRAPH}/${igId}?fields=followers_count,media_count,name,username&access_token=${token}`),
      // Monthly insights: reach, impressions, profile views
      fetch(`${GRAPH}/${igId}/insights?metric=reach,impressions,profile_views&period=month&access_token=${token}`),
      // Recent 8 posts: likes, comments, timestamp, type
      fetch(`${GRAPH}/${igId}/media?fields=like_count,comments_count,timestamp,media_type,caption,permalink&limit=8&access_token=${token}`),
    ]);

    const [profile, insights, media] = await Promise.all([
      profileRes.json(),
      insightsRes.json(),
      mediaRes.json(),
    ]);

    if (profile.error)  throw new Error(`Profile: ${profile.error.message}`);
    if (insights.error) throw new Error(`Insights: ${insights.error.message}`);

    // Map insights by name → latest period value
    const insightMap = {};
    (insights.data || []).forEach(item => {
      const latest = item.values?.[item.values.length - 1]?.value ?? 0;
      insightMap[item.name] = latest;
    });

    // Recent posts + engagement rate
    const posts = (media.data || []).map(p => ({
      likes:    p.like_count      || 0,
      comments: p.comments_count  || 0,
      date:     p.timestamp,
      type:     p.media_type,
      caption:  (p.caption || '').slice(0, 140),
      url:      p.permalink,
    }));

    const totalEng   = posts.reduce((s, p) => s + p.likes + p.comments, 0);
    const avgEng     = posts.length ? Math.round(totalEng / posts.length) : 0;
    const engRate    = profile.followers_count
      ? parseFloat(((avgEng / profile.followers_count) * 100).toFixed(2))
      : 0;

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({
      configured:     true,
      username:       profile.username      || '',
      followers:      profile.followers_count || 0,
      mediaCount:     profile.media_count    || 0,
      reach:          insightMap.reach        || 0,
      impressions:    insightMap.impressions  || 0,
      profileViews:   insightMap.profile_views || 0,
      engagementRate: engRate,
      avgEngagement:  avgEng,
      recentPosts:    posts.slice(0, 5),
      fetchedAt:      Date.now(),
    });

  } catch (err) {
    console.error('Instagram API error:', err.message);
    // Token likely expired — prompt re-auth
    const expired = err.message.includes('token') || err.message.includes('Token') || err.message.includes('190');
    return res.status(200).json({
      configured: true,
      error:      err.message,
      expired,
      message: expired
        ? 'Access token expired. Visit /api/instagram/auth to re-authorize.'
        : err.message,
    });
  }
}
