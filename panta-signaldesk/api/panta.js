const BASE = 'https://live-api.panta.market/api/v1';
const ALLOWED = new Set(['markets','categories','positions','wallets']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex');
  if(!['GET','HEAD'].includes(req.method)) return res.status(405).json({error:'read_only_proxy'});

  const key = process.env.PANTA_API_KEY;
  if(!key) return res.status(503).json({error:'panta_api_key_not_configured'});

  const raw = String(req.query.path || '').replace(/^\/+|\/+$/g,'');
  if(!raw) return res.status(400).json({error:'path_required'});
  const first = raw.split('/')[0];
  if(!ALLOWED.has(first)) return res.status(403).json({error:'route_not_allowed'});

  const query = new URLSearchParams();
  for(const [k,v] of Object.entries(req.query || {})){
    if(k==='path') continue;
    if(Array.isArray(v)) v.forEach(x=>query.append(k,String(x)));
    else if(v!==undefined && v!==null) query.append(k,String(v));
  }
  const suffix = raw.split('/').map(encodeURIComponent).join('/');
  const upstream = `${BASE}/${suffix}/${query.toString()?`?${query.toString()}`:''}`;

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),12000);
  try{
    const r = await fetch(upstream,{method:req.method,headers:{Accept:'application/json','X-Api-Key':key},signal:controller.signal});
    const body = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type',r.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(body);
  }catch(error){
    const timedOut = error && error.name === 'AbortError';
    return res.status(timedOut?504:502).json({error:timedOut?'panta_upstream_timeout':'panta_upstream_failed',detail:String(error?.message||error)});
  }finally{ clearTimeout(timer); }
};