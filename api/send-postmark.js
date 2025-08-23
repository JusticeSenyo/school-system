// api/send-postmark.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { full_name, email, role, tempPassword, loginUrl, from } = req.body || {};
    if (!email || !tempPassword) return res.status(400).json({ error: 'Missing email or tempPassword' });

    const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN;      // set in Vercel dashboard
    const POSTMARK_FROM  = from || process.env.POSTMARK_FROM;
    const LOGIN_URL      = loginUrl || process.env.LOGIN_URL || 'https://schoolmasterhub.vercel.app/login';

    const pmRes = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: POSTMARK_FROM,
        To: email,
        Subject: 'Welcome to SchoolMasterHub',
        HtmlBody: `
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
        `,
        MessageStream: 'outbound',
      }),
    });

    const data = await pmRes.json().catch(() => ({}));
    if (!pmRes.ok) {
      return res.status(pmRes.status).json({ error: data?.Message || `Postmark error ${pmRes.status}` });
    }
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
