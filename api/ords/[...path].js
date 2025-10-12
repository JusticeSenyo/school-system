// api/ords/[...path].js  (CommonJS)
const ORDS_BASE =
  process.env.ORDS_BASE ||
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCors(res); res.status(204).end(); return;
  }

  const segs = Array.isArray(req.query.path) ? req.query.path : [];

  // 🔎 1) Health check - doesn’t hit ORDS
  if (segs[0] === 'health') {
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok: true, runtime: 'nodejs', base: ORDS_BASE }));
    return;
  }

  // 🔎 2) Echo endpoint - shows what we would call upstream
  if (segs[0] === 'echo') {
    const qs = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';
    const targetUrl = `${ORDS_BASE}/${segs.slice(1).join('/')}${qs}`;
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      targetUrl,
      method: req.method,
      headersForwarded: ['authorization','content-type','accept'].filter(h => h in (req.headers || {})),
    }));
    return;
  }

  try {
    const qs = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';
    const targetUrl = `${ORDS_BASE}/${segs.join('/')}${qs}`;

    // Minimal safe header forward
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (['authorization','content-type','accept'].includes(k.toLowerCase())) headers.set(k, v);
    }

    let body;
    if (!['GET','HEAD'].includes(req.method)) {
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json') && req.body && typeof req.body === 'object') body = JSON.stringify(req.body);
      else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) body = req.body;
    }

    const resp = await fetch(targetUrl, { method: req.method, headers, body });
    const buf = Buffer.from(await resp.arrayBuffer());

    setCors(res);
    res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/octet-stream');
    if (req.method === 'GET') res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(resp.status).send(buf);
  } catch (err) {
    setCors(res);
    res.status(502).json({ success:false, error:'Upstream error or network failure', detail: err?.message });
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = handler;
module.exports.config = { runtime: 'nodejs' };
