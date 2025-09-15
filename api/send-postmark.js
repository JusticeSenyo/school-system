// /api/send-postmark.js   <-- SendGrid-powered, school name & login URL dynamic
import sgMail from '@sendgrid/mail';

// ---- CORS ----
const ORIGIN_WHITELIST = new Set([
  'http://localhost:3000',
  'https://schoolmasterhub.vercel.app',
  'http://app.schoolmasterhub.net',
  'https://app.schoolmasterhub.net',
]);

function isEmail(s = '') {
  return /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(s);
}
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s = '') {
  return String(s).replace(/"/g, '&quot;');
}
function parseBcc(bcc) {
  if (!bcc) return undefined;
  if (Array.isArray(bcc)) return bcc.filter(Boolean);
  if (typeof bcc === 'string') {
    const arr = bcc.split(',').map(x => x.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  return undefined;
}
// Extract the email part from EMAIL_FROM; display name will be overridden by schoolName
function extractEmail(fromValue = '') {
  // supports "Display Name <email@domain>" OR "email@domain"
  const m = String(fromValue).match(/<?([^<>@\s]+@[^<>@\s]+)>?$/);
  return (m ? m[1] : String(fromValue).trim()) || 'no-reply@schoolmasterhub.net';
}

const SENDGRID_KEY = (process.env.SENDGRID_API_KEY ?? '').trim();
const DEFAULT_FROM_EMAIL = extractEmail(process.env.EMAIL_FROM);
const LOGIN_HOST = 'http://app.schoolmasterhub.net';

// Set once at module load
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

export default async function handler(req, res) {
  const reqOrigin = req.headers.origin || '';
  const allowOrigin = ORIGIN_WHITELIST.has(reqOrigin)
    ? reqOrigin
    : 'https://schoolmasterhub.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-smh-token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Optional tiny abuse guard
    const PUBLIC_TOKEN = process.env.PUBLIC_EMAIL_API_TOKEN;
    if (PUBLIC_TOKEN) {
      const token = req.headers['x-smh-token'] || req.body?.token;
      if (token !== PUBLIC_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!SENDGRID_KEY) {
      return res.status(500).json({ error: 'SENDGRID_API_KEY not set on server' });
    }

    const {
      full_name,
      email,
      role,
      tempPassword,
      // allow passing these, but we override/derive below
      schoolName: bodySchoolName,
      school_name: bodySchool_name,
      school_id: bodySchoolId,
      schoolId: bodySchoolIdAlt,
      // optional overrides
      from,         // if you ever want to force a different sender
      replyTo,
      bcc,
    } = req.body || {};

    if (!email || !tempPassword) {
      return res.status(400).json({ error: 'Missing email or tempPassword' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // ---- School identity (name + id) ----
    const schoolName =
      (bodySchoolName || bodySchool_name || process.env.SCHOOL_NAME || 'Your School').toString();

    const schoolId =
      bodySchoolId ?? bodySchoolIdAlt ?? null;

    // Final login URL as requested
    const LOGIN_URL = schoolId
      ? `${LOGIN_HOST}/login/?p_school_id=${encodeURIComponent(schoolId)}`
      : `${LOGIN_HOST}/login`;

    // ---- Email content (fully school-branded) ----
    const subject = `Welcome to SchoolMasterHub`;

    const html = `
      <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#111">Welcome, ${escapeHtml(full_name || '')} 🎉</h2>
        <p>You have been added as <b>${escapeHtml(role || 'Staff')}</b> at <b>${escapeHtml(schoolName)}</b>.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:16px 0">
          <p><b>Login details</b></p>
          <p>Email: ${escapeHtml(email)}<br/>
          Temporary Password: <b>${escapeHtml(tempPassword)}</b></p>
        </div>
        <p>
          <a href="${escapeAttr(LOGIN_URL)}"
             style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;
             text-decoration:none;border-radius:6px;font-weight:500">
             Log in to ${escapeHtml(schoolName)}
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:20px">
          ⚠️ Please change your password after logging in.
        </p>
      </div>
    `.trim();

    const text = [
      `Welcome, ${full_name || ''}`,
      `You have been added as ${role || 'Staff'} at ${schoolName}.`,
      `Login details:`,
      `Email: ${email}`,
      `Temporary Password: ${tempPassword}`,
      `Login: ${LOGIN_URL}`,
      `Please change your password after logging in.`,
    ].join('\n');

    // From: keep your verified sender email, but show the school's name as display name
    const fromEmail = extractEmail(from || process.env.EMAIL_FROM);
    const fromName = schoolName;

    const msg = {
      to: email,
      from: { email: fromEmail, name: fromName },
      subject,
      text,
      html,
      categories: ['welcome'],
      trackingSettings: { clickTracking: { enable: false, enableText: false } },
      mailSettings: {
        sandboxMode: { enable: process.env.SENDGRID_SANDBOX === '1' },
      },
    };

    const bccParsed = parseBcc(bcc);
    if (bccParsed) msg.bcc = bccParsed;
    if (replyTo) msg.replyTo = replyTo;

    const [sgRes] = await sgMail.send(msg, false);
    if (sgRes.statusCode >= 200 && sgRes.statusCode < 300) {
      return res.status(200).json({ ok: true, status: sgRes.statusCode });
    }
    return res.status(sgRes.statusCode || 502).json({ error: `Unexpected status ${sgRes.statusCode}` });
  } catch (err) {
    const status = err?.response?.statusCode || err?.code || 502;
    const body = err?.response?.body;
    const detailMsg =
      body?.errors?.map(e => e?.message).join('; ') ||
      err?.message ||
      'SendGrid error';
    return res.status(status).json({ error: detailMsg, detail: body });
  }
}
