// api/instagram/callback.js
// Meta redirects here after the page admin authorizes the app.
// Exchanges the code → short-lived token → long-lived token (60 days),
// then fetches the connected Instagram Business Account ID.
// Displays both values clearly so they can be added as Vercel env vars.

const GRAPH = 'https://graph.facebook.com/v19.0';

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(errorPage(`Meta OAuth error: ${error}`, error_description));
  }
  if (!code) {
    return res.status(400).send(errorPage('No authorization code received.', 'Try visiting /api/instagram/auth again.'));
  }

  const APP_ID     = process.env.META_APP_ID      || '1472036191387610';
  const APP_SECRET = process.env.META_APP_SECRET;
  const REDIRECT   = process.env.META_REDIRECT_URI || 'https://solvepestpros.com/api/instagram/callback';

  if (!APP_SECRET) {
    return res.status(500).send(errorPage(
      'META_APP_SECRET is not set.',
      'Add it to Vercel → Project → Settings → Environment Variables, then redeploy.'
    ));
  }

  try {
    // ── 1. Short-lived token ──────────────────────────────
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token` +
      `?client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
      `&code=${code}`
    );
    const shortData = await shortRes.json();
    if (shortData.error) throw new Error(`Short-lived token: ${shortData.error.message}`);

    // ── 2. Long-lived token (60 days) ─────────────────────
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}` +
      `&fb_exchange_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(`Long-lived token: ${longData.error.message}`);
    const pageToken = longData.access_token;

    // ── 3. Get Pages + Instagram Business Account IDs ─────
    const accountsRes = await fetch(`${GRAPH}/me/accounts?access_token=${pageToken}`);
    const accountsData = await accountsRes.json();
    if (accountsData.error) throw new Error(`Accounts: ${accountsData.error.message}`);

    const pages = accountsData.data || [];
    const connected = [];

    for (const page of pages) {
      // Get long-lived Page Access Token for each page
      const pageTokenRes = await fetch(
        `${GRAPH}/${page.id}?fields=access_token,instagram_business_account&access_token=${pageToken}`
      );
      const pageData = await pageTokenRes.json();

      if (pageData.instagram_business_account) {
        // Get Instagram account details
        const igRes = await fetch(
          `${GRAPH}/${pageData.instagram_business_account.id}` +
          `?fields=username,name,followers_count&access_token=${pageData.access_token || pageToken}`
        );
        const igData = await igRes.json();

        connected.push({
          pageName:     page.name,
          pageId:       page.id,
          pageToken:    pageData.access_token || pageToken,
          igId:         pageData.instagram_business_account.id,
          igUsername:   igData.username   || '—',
          igFollowers:  igData.followers_count || 0,
        });
      }
    }

    // ── 4. Render success page with env var values ────────
    const expiresDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram Connected — Solve Marketing OS</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f2;margin:0;padding:40px 20px;color:#1a1916}
  .wrap{max-width:720px;margin:0 auto}
  .header{background:#223241;color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:24px}
  .header h1{margin:0 0 6px;font-size:20px}
  .header p{margin:0;font-size:13px;color:rgba(255,255,255,.55)}
  .card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:24px;margin-bottom:16px}
  .card h2{margin:0 0 16px;font-size:15px;color:#223241}
  .env-row{margin-bottom:14px}
  .env-label{font-size:12px;font-weight:600;color:#5f5e59;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em}
  .env-value{background:#f0f0ee;border:1px solid #ddd;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:12px;word-break:break-all;position:relative}
  .copy-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:#046c5e;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer}
  .step{display:flex;gap:12px;margin-bottom:12px;font-size:13px;align-items:flex-start}
  .step-n{background:#223241;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;margin-top:1px}
  .warn{background:#faeeda;border:1px solid #f5c06e;border-radius:8px;padding:14px 18px;font-size:13px;color:#854f0b;margin-bottom:16px}
  .success-badge{display:inline-flex;align-items:center;gap:6px;background:#e1f5ee;color:#0f6e56;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin-bottom:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>✓ Instagram Authorization Complete</h1>
    <p>Solve Marketing OS — Meta OAuth callback</p>
  </div>

  ${connected.length === 0 ? `
  <div class="warn">
    <strong>⚠ No Instagram Business Account found.</strong><br>
    Make sure your Instagram is set to a Business or Creator account and is linked to your Facebook Page, then try again.
  </div>` : ''}

  ${connected.map(acc => `
  <div class="card">
    <div class="success-badge">● Connected · @${acc.igUsername} · ${acc.igFollowers.toLocaleString()} followers</div>
    <h2>Environment Variables — add these to Vercel</h2>

    <div class="env-row">
      <div class="env-label">INSTAGRAM_PAGE_TOKEN</div>
      <div class="env-value" id="tok-${acc.igId}">${acc.pageToken}
        <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('tok-${acc.igId}').innerText.replace('Copy','').trim());this.textContent='Copied!'">Copy</button>
      </div>
    </div>

    <div class="env-row">
      <div class="env-label">INSTAGRAM_BUSINESS_ID</div>
      <div class="env-value">${acc.igId}</div>
    </div>

    <div class="env-row">
      <div class="env-label">INSTAGRAM_PAGE_ID</div>
      <div class="env-value">${acc.pageId}</div>
    </div>

    <p style="font-size:12px;color:#9b9a94;margin-top:8px">
      Token expires <strong>${expiresDate}</strong>. Visit <code>/api/instagram/auth</code> to re-authorize before then.
    </p>
  </div>`).join('')}

  <div class="card">
    <h2>Next steps</h2>
    <div class="step"><div class="step-n">1</div><div>Go to <strong>vercel.com → your project → Settings → Environment Variables</strong></div></div>
    <div class="step"><div class="step-n">2</div><div>Add <strong>INSTAGRAM_PAGE_TOKEN</strong> and <strong>INSTAGRAM_BUSINESS_ID</strong> from above</div></div>
    <div class="step"><div class="step-n">3</div><div>Click <strong>Redeploy</strong> in Vercel so the new env vars take effect</div></div>
    <div class="step"><div class="step-n">4</div><div>The KPI dashboard will now show live Instagram data automatically</div></div>
  </div>
</div>
</body>
</html>`);

  } catch (err) {
    return res.status(500).send(errorPage('Something went wrong during OAuth.', err.message));
  }
}

function errorPage(title, detail) {
  return `<!DOCTYPE html><html><head><title>Error</title>
  <style>body{font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px}
  .box{background:#fcebeb;border:1px solid #f5c6c6;border-radius:8px;padding:20px;color:#a32d2d}
  h2{margin:0 0 8px}p{margin:0;font-size:13px}</style></head>
  <body><div class="box"><h2>⚠ ${title}</h2><p>${detail || ''}</p></div>
  <p style="margin-top:16px;font-size:13px"><a href="/api/instagram/auth">← Try again</a></p>
  </body></html>`;
}
