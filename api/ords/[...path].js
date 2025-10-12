// api/ords/[...path].js
// Catch-all proxy to Oracle ORDS with CORS headers

const RAW_ORDS_BASE =
  process.env.ORDS_BASE ||
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// normalize base (no trailing slash)
const ORDS_BASE = RAW_ORDS_BASE.replace(/\/+$/, '');

async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return;
  }

  const segsIn = Array.isArray(req.query.path) ? req.query.path : [];

  // Optional health (stays here too so you don't need a separate file)
  if (segsIn[0] === 'health') {
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok: true, base: ORDS_BASE }));
    return;
  }

  // Optional: echo to debug final upstream URL
  if (segsIn[0] === 'echo') {
    const segs = segsIn.slice(1);
    const targetUrl = buildTargetUrl(segs, req.url);
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok: true, targetUrl }));
    return;
  }

  try {
    const targetUrl = buildTargetUrl(segsIn.slice(), req.url);

    // Forward minimal headers safely
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      const kl = k.toLowerCase();
      if (kl === 'authorization' || kl === 'content-type' || kl === 'accept') headers.set(k, v);
    }

    // Forward body only for non-GET/HEAD
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json') && req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        body = req.body;
      }
    }

    const resp = await fetch(targetUrl, { method: req.method, headers, body });
    const buf = Buffer.from(await resp.arrayBuffer());

    setCors(res);
    res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/octet-stream');
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    }
    res.status(resp.status).send(buf);
  } catch (err) {
    setCors(res);
    res.status(502).json({ success: false, error: 'Upstream error or network failure', detail: err?.message });
  }
}

function buildTargetUrl(segs, reqUrl) {
  // avoid duplicate /schools if someone mis-set ORDS_BASE to .../ords/schools
  const baseHasSchools = /\/ords\/schools$/i.test(ORDS_BASE);
  if (baseHasSchools && segs[0] && segs[0].toLowerCase() === 'schools') segs = segs.slice(1);

  const qs = reqUrl.includes('?') ? `?${reqUrl.split('?')[1]}` : '';
  // collapse duplicate // but keep protocol
  return `${ORDS_BASE}/${segs.join('/')}${qs}`.replace(/([^:]\/)\/+/g, '$1');
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
