const BASE = 'https://live-api.panta.market/api/v1';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    return res.status(405).json({ error: 'read_only_proxy' });
  }

  const key = process.env.PANTA_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'panta_api_key_not_configured' });
  }

  const rawPath = req.query.path;
  const parts = Array.isArray(rawPath) ? rawPath : [rawPath].filter(Boolean);
  const first = parts[0] || '';
  const allowed = new Set(['markets', 'categories', 'positions', 'wallets']);
  if (!allowed.has(first)) {
    return res.status(403).json({ error: 'route_not_allowed' });
  }

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach(x => query.append(k, x));
    else if (v != null) query.append(k, String(v));
  }

  const suffix = parts.map(encodeURIComponent).join('/');
  const upstream = `${BASE}/${suffix}/${query.toString() ? `?${query}` : ''}`;

  try {
    const r = await fetch(upstream, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'X-Api-Key': key,
      },
    });
    const body = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(body);
  } catch (error) {
    return res.status(502).json({ error: 'panta_upstream_failed', detail: String(error && error.message ? error.message : error) });
  }
};
