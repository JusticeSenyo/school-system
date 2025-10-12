// api/ords/[...path].js  (ESM)
export const config = { runtime: 'nodejs' };

const RAW_ORDS_BASE =
  process.env.ORDS_BASE ||
  'https://gb3c4b8d5922445-kingsford1.adb.af-johannesburg-1.oraclecloudapps.com/ords';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const ORDS_BASE = RAW_ORDS_BASE.replace(/\/+$/, '');

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return;
  }

  const segsIn = Array.isArray(req.query.path) ? req.query.path : [];

  if (segsIn[0] === 'health') {
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok: true, base: ORDS_BASE }));
    return;
  }

  if (segsIn[0] === 'echo') {
    const targetUrl = buildTargetUrl(segsIn.slice(1), req.url);
    setCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok: true, targetUrl }));
    return;
  }

  try {
    const targetUrl = buildTargetUrl(segsIn.slice(), req.url);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      const kl = k.toLowerCase();
      if (kl === 'authorization' || kl === 'content-type' || kl === 'accept') headers.set(k, v);
    }

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
  const qs = reqUrl.includes('?') ? `?${reqUrl.split('?')[1]}` : '';
  return `${ORDS_BASE}/${segs.join('/')}${qs}`.replace(/([^:]\/)\/+/g, '$1');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}
