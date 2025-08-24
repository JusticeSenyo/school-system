// /api/send-postmark.js
export default async function handler(req, res) {
  // ---- CORS ----
  const ORIGIN_WHITELIST = new Set([
    'http://localhost:3000',
    'https://schoolmasterhub.vercel.app',
    'https://schoolmasterhub-3soh.vercel.app',
  ]);

  const reqOrigin = req.headers.origin || '';
  const allowOrigin = ORIGIN_WHITELIST.has(reqOrigin) ? reqOrigin : 'https://schoolmasterhub-3soh.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // keep minimal (no Authorization needed)
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Optional tiny abuse guard: require a shared token for public origins
    const PUBLIC_TOKEN = process.env.PUBLIC_EMAIL_API_TOKEN; // set in Vercel
    if (PUBLIC_TOKEN) {
      const token = req.headers['x-smh-token'] || req.body?.token;
      if (token !== PUBLIC_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      full_name,
      email,
      role,
      tempPassword,
      loginUrl,
      from,
      replyTo,
      bcc,
    } = req.body || {};

    if (!email || !tempPassword) {
      return res.status(400).json({ error: 'Missing email or tempPassword' });
    }

    // very light email sanity check
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN;
    const POSTMARK_FROM  = from || process.env.POSTMARK_FROM;
    const LOGIN_URL      = loginUrl || process.env.LOGIN_URL || 'https://schoolmasterhub.vercel.app/login';

    if (!POSTMARK_TOKEN) return res.status(500).json({ error: 'POSTMARK_TOKEN not set' });
    if (!POSTMARK_FROM)  return res.status(500).json({ error: 'POSTMARK_FROM not set' });

    const subject = 'Welcome to SchoolMasterHub';
    const html = `
      <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#111">Welcome, ${full_name || ''} 🎉</h2>
        <p>You have been added as <b>${role || 'Staff'}</b> at SchoolMasterHub.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:16px 0">
          <p><b>Login details</b></p>
          <p>Email: ${email}<br/>
          Temporary Password: <b>${tempPassword}</b></p>
        </div>
        <p>
          <a href="${LOGIN_URL}"
             style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;
             text-decoration:none;border-radius:6px;font-weight:500">
             Log in to SchoolMasterHub
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:20px">
          ⚠️ Please change your password after logging in.
        </p>
      </div>
    `.trim();

    const text = [
      `Welcome, ${full_name || ''}`,
      `You have been added as ${role || 'Staff'} at SchoolMasterHub.`,
      `Login details:`,
      `Email: ${email}`,
      `Temporary Password: ${tempPassword}`,
      `Login: ${LOGIN_URL}`,
      `Please change your password after logging in.`,
    ].join('\n');

    const payload = {
      From: POSTMARK_FROM,
      To: email,
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      ...(bcc ? { Bcc: bcc } : {}),
      Subject: subject,
      HtmlBody: html,
      TextBody: text,             // nice to have for plain-text clients/spam scoring
      MessageStream: 'outbound',
      Tag: 'welcome',             // optional tag to help in Postmark analytics
    };

    const pmRes = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await pmRes.json().catch(() => ({}));

    if (!pmRes.ok || data?.ErrorCode) {
      // Surface the Postmark message if present
      const msg = data?.Message || `Postmark error ${pmRes.status}`;
      return res.status(pmRes.status || 502).json({ error: msg, detail: data });
    }

    // success
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
