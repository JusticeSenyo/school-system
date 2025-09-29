// /api/send-email.js
const sgMail = require('@sendgrid/mail');

const SENDGRID_KEY = (process.env.SENDGRID_API_KEY || '').trim();
const FROM = process.env.EMAIL_FROM || 'School Master Hub <no-reply@schoolmasterhub.net>';

function keyLooksValid(k) {
  return /^SG\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(k || '');
}
function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function toHtml(text = '') {
  return escapeHtml(text).replace(/\n/g, '<br>');
}
function shouldRetry(err) {
  const status = err?.response?.statusCode ?? err?.code ?? err?.statusCode;
  return status === 429 || (typeof status === 'number' && status >= 500 && status < 600);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  if (!keyLooksValid(SENDGRID_KEY)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MAIL DEV] SENDGRID_API_KEY missing/invalid — skipping real send.');
      res.status(200).json({ success: true, dev: true });
      return;
    }
    res.status(500).json({ success: false, error: 'Email not configured on server.' });
    return;
  }

  const { to, subject, message, fromName } = req.body || {};
  const list = Array.isArray(to) ? to.filter(Boolean) : [];
  if (!list.length) {
    res.status(400).json({ success: false, error: 'No recipients.' });
    return;
  }

  try {
    sgMail.setApiKey(SENDGRID_KEY);

    const fromAddress =
      FROM.includes('<') ? (FROM.match(/<(.*?)>/)?.[1] || FROM) : FROM;

    const CHUNK = 500;
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);

      const payload = {
        personalizations: [{ to: chunk.map((email) => ({ email })) }],
        from: { email: fromAddress, name: fromName || 'School Master Hub' },
        subject: subject || '',
        content: [
          { type: 'text/plain', value: String(message || '') },
          { type: 'text/html',  value: toHtml(message || '') },
        ],
        trackingSettings: { clickTracking: { enable: false, enableText: false } },
        mailSettings: { sandboxMode: { enable: false } },
      };

      try {
        const [resp] = await sgMail.send(payload, false);
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          throw new Error(`Unexpected status ${resp.statusCode}`);
        }
      } catch (err) {
        if (shouldRetry(err)) {
          await new Promise((r) => setTimeout(r, 600));
          const [resp2] = await sgMail.send(payload, false);
          if (resp2.statusCode < 200 || resp2.statusCode >= 300) {
            throw new Error(`Unexpected status ${resp2.statusCode}`);
          }
        } else {
          const body = err?.response?.body;
          throw new Error(
            body?.errors?.map((e) => e?.message).join('; ') ||
            err?.message || 'Email send failed'
          );
        }
      }
    }

    res.status(200).json({ success: true, sent: list.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Email send failed' });
  }
};
