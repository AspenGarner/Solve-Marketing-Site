// api/instagram/auth.js
// Initiates the Meta OAuth flow — visit /api/instagram/auth to start
// The page admin clicks this link, authorizes the app, and gets redirected to /callback

export default function handler(req, res) {
  const APP_ID      = process.env.META_APP_ID      || '1472036191387610';
  const REDIRECT    = process.env.META_REDIRECT_URI || 'https://solvepestpros.com/api/instagram/callback';

  const scopes = [
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_insights',
    'pages_read_engagement',
  ].join(',');

  const url =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_type=code` +
    `&state=solve-marketing-os`;

  res.redirect(302, url);
}
