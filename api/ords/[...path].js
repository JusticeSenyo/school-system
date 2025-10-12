// api/ords/[...path].js
// Vercel serverless proxy → Oracle ORDS, with CORS headers added.

const ORDS_BASE =
  process.env.ORDS_BASE ||
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords';

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || '*'; // e.g. "https://app.schoolmasterhub.net"

export default async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return;
  }

  try {
    const segs = Array.isArray(req.query.path) ? req.query.path : [];
    const qsIndex = req.url.indexOf('?');
    const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
    const targetUrl = `${ORDS_BASE}/${segs.join('/')}${qs}`;

    // Forward a minimal, safe header set
    const headers = new Headers();
    const pass = ['authorization', 'content-type', 'accept'];
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (pass.includes(k.toLowerCase())) headers.set(k, v);
    }

    // Build the body
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json') && req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        body = req.body;
      } else {
        // If you need to support form-data, add a parser and forward here.
        body = undefined;
      }
    }

    const resp = await fetch(targetUrl, { method: req.method, headers, body });

    // Copy status and content-type
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await resp.arrayBuffer());

    setCors(res);
    res.setHeader('Content-Type', contentType);
    // (Optional) CDN cache for GETs:
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    }
    res.status(resp.status).send(buf);
  } catch (err) {
    setCors(res);
    res
      .status(502)
      .json({ success: false, error: 'Upstream error or network failure', detail: err?.message });
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export const config = { runtime: 'nodejs18.x' };
