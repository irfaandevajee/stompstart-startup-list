const $ = (id) => document.getElementById(id);
const state = {
  markets: [], filtered: [], selectedId: null, categories: [],
  watch: new Set(JSON.parse(localStorage.getItem('signaldesk-watch') || '[]')),
  syncedAt: null
};

const keys = {
  title:['question','title','name','marketQuestion','market_question','description'],
  category:['category','categoryName','category_name','vertical','topic'],
  probability:['yesProbability','yes_probability','probability','yesPrice','yes_price','priceYes','price_yes','currentYesPrice','current_yes_price','yes'],
  volume:['volume','totalVolume','total_volume','tradingVolume','trading_volume','volumeUsd','volume_usd'],
  liquidity:['liquidity','totalLiquidity','total_liquidity','liquidityUsd','liquidity_usd'],
  activity:['tradeCount','trade_count','tradesCount','trades_count','numTrades','num_trades','transactions','activity'],
  status:['status','marketStatus','market_status','state','phase'],
  resolution:['resolutionDate','resolution_date','resolveAt','resolve_at','endDate','end_date','expiresAt','expires_at','closeTime','close_time'],
  id:['id','marketId','market_id','address','publicKey','public_key','slug'],
  slug:['slug']
};

function pick(obj, list){ for(const k of list){ if(obj && obj[k] !== undefined && obj[k] !== null) return obj[k]; } return null; }
function num(v){ const x = Number(v); return Number.isFinite(x) ? x : null; }
function arrFrom(d){
  if(Array.isArray(d)) return d;
  const candidates=['data','markets','results','items','rows'];
  for(const k of candidates){ if(Array.isArray(d?.[k])) return d[k]; if(Array.isArray(d?.data?.[k])) return d.data[k]; }
  return [];
}
function title(m){ return String(pick(m,keys.title) || 'Untitled market'); }
function category(m){ const c=pick(m,keys.category); return typeof c==='object' ? String(c.name||c.title||'Other') : String(c||'Other'); }
function status(m){ return String(pick(m,keys.status) || 'Live'); }
function id(m){ return String(pick(m,keys.id) || title(m)); }
function probability(m){
  let v=pick(m,keys.probability); if(v && typeof v==='object') v=v.price ?? v.probability ?? v.value;
  v=num(v); if(v===null) return null; if(v>1 && v<=100) v/=100; return Math.max(0,Math.min(1,v));
}
function volume(m){ return num(pick(m,keys.volume)); }
function liquidity(m){ return num(pick(m,keys.liquidity)); }
function activity(m){ return num(pick(m,keys.activity)); }
function resolution(m){ return pick(m,keys.resolution); }
function fmtPct(v){ return v===null ? '—' : `${(v*100).toFixed(1)}%`; }
function fmtNum(v){
  if(v===null || v===undefined) return '—';
  const a=Math.abs(v); if(a>=1e9) return `${(v/1e9).toFixed(1)}B`; if(a>=1e6) return `${(v/1e6).toFixed(1)}M`; if(a>=1e3) return `${(v/1e3).toFixed(1)}K`;
  return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
}
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function percentile(value, values){
  if(value===null || !values.length) return 0;
  const valid=values.filter(v=>v!==null).sort((a,b)=>a-b); if(!valid.length) return 0;
  const less=valid.filter(v=>v<value).length; const equal=valid.filter(v=>v===value).length;
  return Math.round(((less + equal*0.5)/valid.length)*100);
}
function scores(m){
  const p=probability(m), v=volume(m), l=liquidity(m), a=activity(m);
  const volumes=state.markets.map(volume).filter(v=>v!==null), liquids=state.markets.map(liquidity).filter(v=>v!==null), acts=state.markets.map(activity).filter(v=>v!==null);
  const pv=percentile(v,volumes), pl=percentile(l,liquids), pa=percentile(a,acts);
  const present=[p,v,l,a,status(m),resolution(m)].filter(x=>x!==null && x!==undefined && x!=='').length;
  const quality=Math.round((present/6)*100);
  const conviction=p===null?0:Math.round(Math.abs(p-.5)*200);
  const components=[v!==null?pv:null,l!==null?pl:null,a!==null?pa:null].filter(x=>x!==null);
  const attention=components.length?Math.round(components.reduce((x,y)=>x+y,0)/components.length):0;
  const signal=Math.round(attention*.5+conviction*.3+quality*.2);
  return {conviction,attention,quality,signal,pv,pl,pa};
}
function pantaUrl(m){
  const mid=pick(m,['address','publicKey','public_key','id','marketId','market_id']), slug=pick(m,keys.slug);
  if(mid && slug) return `https://panta.market/market/${encodeURIComponent(mid)}/${encodeURIComponent(slug)}`;
  if(mid) return `https://panta.market/market/${encodeURIComponent(mid)}`;
  return 'https://panta.market';
}
async function api(path, params={}){
  const q=new URLSearchParams({path,...params});
  const r=await fetch(`/api/panta?${q}`,{headers:{Accept:'application/json'},cache:'no-store'});
  const text=await r.text(); let data; try{ data=JSON.parse(text); }catch{ data={raw:text}; }
  if(!r.ok){ const err=new Error(data?.detail||data?.error||`Panta API ${r.status}`); err.status=r.status; throw err; }
  return data;
}
function setError(msg=''){ const el=$('errorBanner'); if(!msg){el.classList.add('hidden');el.textContent='';} else {el.classList.remove('hidden');el.textContent=msg;} }
function syncWatch(){ localStorage.setItem('signaldesk-watch',JSON.stringify([...state.watch])); renderWatchlist(); renderMarkets(); if(state.selectedId) renderDetail(selected()); }
function selected(){ return state.markets.find(m=>id(m)===state.selectedId) || null; }

async function loadAll(){
  $('refreshBtn').disabled=true; $('refreshBtn').textContent='Refreshing…'; setError('');
  $('apiHealth').innerHTML='<span class="status-dot pending"></span> Checking';
  try{
    const [marketData, categoryData] = await Promise.all([
      api('markets').catch(e=>{throw e}),
      api('categories').catch(()=>null)
    ]);
    const markets=arrFrom(marketData);
    if(!markets.length) throw new Error('Panta returned no markets for this API environment.');
    state.markets=markets; state.categories=categoryData?arrFrom(categoryData):[];
    state.syncedAt=new Date();
    if(!state.selectedId || !state.markets.some(m=>id(m)===state.selectedId)) state.selectedId=id(state.markets[0]);
    populateCategories(); renderAll();
    $('apiHealth').innerHTML='<span class="status-dot good"></span> Live';
    $('marketCount').textContent=String(state.markets.length);
    $('categoryCount').textContent=String(new Set(state.markets.map(category)).size);
    $('lastSync').textContent=state.syncedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const sandbox=state.markets.some(m=>/sandbox|test market/i.test(title(m)));
    $('environmentBadge').textContent=sandbox?'Panta test/sandbox environment':'Panta live environment';
    updateHero();
  }catch(e){
    $('apiHealth').innerHTML='<span class="status-dot bad"></span> Error';
    setError(`Live Panta request failed: ${e.message}`);
    $('marketGrid').innerHTML='<div class="loading">Unable to load live markets. No fallback data has been substituted.</div>';
  }finally{
    $('refreshBtn').disabled=false; $('refreshBtn').textContent='Refresh live data';
  }
}
function populateCategories(){
  const select=$('categorySelect'), current=select.value;
  const cats=[...new Set(state.markets.map(category))].sort((a,b)=>a.localeCompare(b));
  select.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if(cats.includes(current)) select.value=current;
}
function filteredMarkets(){
  const q=$('searchInput').value.trim().toLowerCase(), cat=$('categorySelect').value, sort=$('sortSelect').value;
  let list=state.markets.filter(m=>(!q || title(m).toLowerCase().includes(q) || category(m).toLowerCase().includes(q)) && (!cat || category(m)===cat));
  list=[...list].sort((a,b)=>{
    if(sort==='title') return title(a).localeCompare(title(b));
    if(sort==='probability') return (probability(b)??-1)-(probability(a)??-1);
    if(sort==='volume') return (volume(b)??-1)-(volume(a)??-1);
    if(sort==='conviction') return scores(b).conviction-scores(a).conviction;
    return scores(b).attention-scores(a).attention;
  });
  state.filtered=list; return list;
}
function renderMarkets(){
  const list=filteredMarkets(); $('marketMeta').textContent=`${list.length} of ${state.markets.length} markets`;
  if(!list.length){ $('marketGrid').innerHTML='<div class="loading">No markets match the current filters.</div>'; return; }
  $('marketGrid').innerHTML=list.map(m=>{
    const p=probability(m), s=scores(m), mid=id(m), watched=state.watch.has(mid);
    return `<article class="market-card ${state.selectedId===mid?'active':''}" data-id="${esc(mid)}">
      <div class="card-top"><span class="tag">${esc(category(m))}</span><button class="watch-toggle ${watched?'on':''}" data-watch="${esc(mid)}" aria-label="${watched?'Remove from':'Add to'} watchlist">${watched?'★':'☆'}</button></div>
      <div class="market-title">${esc(title(m))}</div>
      <div class="prob-row"><div class="prob"><small>YES probability</small>${fmtPct(p)}</div><div class="attention">Attention<br><b>${s.attention}</b>/100</div></div>
      <div class="bar"><span style="width:${p===null?0:Math.round(p*100)}%"></span></div>
      <div class="mini-row"><div class="mini"><span>Volume</span><b>${fmtNum(volume(m))}</b></div><div class="mini"><span>Quality</span><b>${s.quality}/100</b></div></div>
    </article>`;
  }).join('');
  document.querySelectorAll('.market-card').forEach(el=>el.addEventListener('click',(ev)=>{
    if(ev.target.closest('[data-watch]')) return;
    state.selectedId=el.dataset.id; renderAll(false);
  }));
  document.querySelectorAll('[data-watch]').forEach(btn=>btn.addEventListener('click',(ev)=>{ ev.stopPropagation(); toggleWatch(btn.dataset.watch); }));
}
function flagsFor(m){
  const f=[], p=probability(m), l=liquidity(m), r=resolution(m), s=scores(m);
  if(p===null) f.push(['Probability missing',true]);
  else if(p<=.1 || p>=.9) f.push(['Extreme probability',true]);
  if(l===null) f.push(['Liquidity unavailable',true]);
  else if(s.pl<=20) f.push(['Thin relative liquidity',true]);
  if(!r) f.push(['Resolution date unavailable',true]);
  if(s.quality<70) f.push(['Partial source fields',true]);
  if(!f.length) f.push(['No major data-quality flags',false]);
  return f;
}
function briefFor(m){
  const p=probability(m), s=scores(m);
  if(p===null) return 'Panta did not return a usable YES probability for this market, so SignalDesk avoids directional interpretation.';
  const direction=p>=.5?'YES':'NO', confidence=s.conviction>=70?'strongly':s.conviction>=35?'moderately':'slightly';
  const attention=s.attention>=70?'high':s.attention>=35?'moderate':'low';
  return `The market currently leans ${confidence} toward ${direction} at ${fmtPct(p)} YES. Relative attention is ${attention} (${s.attention}/100). This is descriptive market context, not a forecast or recommendation.`;
}
function renderDetail(m){
  if(!m){ $('detailPanel').className='empty-state'; $('detailPanel').innerHTML='Select a market to inspect live probability, conviction, attention and data-quality signals.'; return; }
  const s=scores(m), p=probability(m), mid=id(m), watched=state.watch.has(mid), r=resolution(m);
  $('detailPanel').className='detail';
  $('detailPanel').innerHTML=`
    <div class="detail-category">${esc(category(m))} · ${esc(status(m))}</div>
    <h3>${esc(title(m))}</h3>
    <div class="detail-meta">YES ${fmtPct(p)} · Volume ${fmtNum(volume(m))} · Liquidity ${fmtNum(liquidity(m))}${r?` · Resolves ${esc(String(r))}`:''}</div>
    <div class="score-grid">
      <div class="score-box"><span>Conviction</span><b>${s.conviction}</b></div>
      <div class="score-box"><span>Attention</span><b>${s.attention}</b></div>
      <div class="score-box"><span>Data quality</span><b>${s.quality}</b></div>
    </div>
    <div class="brief"><div class="brief-title">Signal interpretation</div><p>${esc(briefFor(m))}</p></div>
    <div class="flags">${flagsFor(m).map(([t,w])=>`<span class="flag ${w?'warn':''}">${esc(t)}</span>`).join('')}</div>
    <div class="detail-actions">
      <button id="detailWatchBtn" class="btn secondary">${watched?'★ Saved':'☆ Add to watchlist'}</button>
      <a class="btn primary" href="${esc(pantaUrl(m))}" target="_blank" rel="noreferrer">Open on Panta ↗</a>
    </div>`;
  $('detailWatchBtn').onclick=()=>toggleWatch(mid);
}
function toggleWatch(mid){ state.watch.has(mid)?state.watch.delete(mid):state.watch.add(mid); syncWatch(); }
function renderWatchlist(){
  const list=state.markets.filter(m=>state.watch.has(id(m)));
  if(!list.length){ $('watchGrid').innerHTML='<div class="empty-tile">No markets saved yet. Use ☆ on any market card.</div>'; return; }
  $('watchGrid').innerHTML=list.map(m=>`<article class="watch-card" data-open="${esc(id(m))}"><button class="remove" data-remove="${esc(id(m))}" aria-label="Remove">×</button><span class="tag">${esc(category(m))}</span><h3>${esc(title(m))}</h3><div class="compare-kpis"><span>YES ${fmtPct(probability(m))}</span><span>Attention ${scores(m).attention}</span></div></article>`).join('');
  document.querySelectorAll('[data-open]').forEach(el=>el.onclick=(ev)=>{ if(ev.target.closest('[data-remove]'))return; state.selectedId=el.dataset.open; location.hash='#markets'; renderAll(false); });
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=(ev)=>{ev.stopPropagation();state.watch.delete(btn.dataset.remove);syncWatch();});
}
function renderCompare(m){
  if(!m){ $('compareGrid').innerHTML='<div class="empty-tile">Select a market to compare it with related markets.</div>'; return; }
  const same=state.markets.filter(x=>id(x)!==id(m)).map(x=>({m:x,rel:(category(x)===category(m)?100:0)+scores(x).attention})).sort((a,b)=>b.rel-a.rel).slice(0,3);
  if(!same.length){ $('compareGrid').innerHTML='<div class="empty-tile">No related markets are available in this API environment.</div>'; return; }
  $('compareGrid').innerHTML=same.map(({m:x})=>`<article class="compare-card" data-compare="${esc(id(x))}"><span class="tag">${esc(category(x))}</span><h3>${esc(title(x))}</h3><div class="compare-kpis"><span>YES ${fmtPct(probability(x))}</span><span>Attention ${scores(x).attention}</span><span>Volume ${fmtNum(volume(x))}</span></div></article>`).join('');
  document.querySelectorAll('[data-compare]').forEach(el=>el.onclick=()=>{state.selectedId=el.dataset.compare;location.hash='#markets';renderAll(false);});
}
function renderRadar(){
  if(!state.markets.length){ $('radarGrid').innerHTML='<div class="empty-tile">Waiting for market data.</div>'; return; }
  const ranked=[...state.markets].sort((a,b)=>scores(b).signal-scores(a).signal).slice(0,4);
  $('radarGrid').innerHTML=ranked.map((m,i)=>{const s=scores(m);return `<article class="radar-card"><div class="radar-rank">#${i+1} signal</div><h3>${esc(title(m))}</h3><div class="radar-score">${s.signal}<span>/100 composite</span></div><div class="radar-line"><span>Attention ${s.attention}</span><span>Conviction ${s.conviction}</span></div></article>`}).join('');
}
function updateHero(){
  if(!state.markets.length) return;
  const top=[...state.markets].sort((a,b)=>scores(b).signal-scores(a).signal)[0], s=scores(top);
  $('heroSignal').textContent=s.signal; $('heroMeter').style.width=`${s.signal}%`;
  $('heroSignalText').textContent=`Top current signal: ${title(top)} — attention ${s.attention}/100, conviction ${s.conviction}/100.`;
}
function renderAll(includeMarket=true){
  if(includeMarket) renderMarkets(); else renderMarkets();
  const m=selected(); renderDetail(m); renderCompare(m); renderWatchlist(); renderRadar(); updateHero();
}
async function loadPositions(){
  const wallet=$('walletInput').value.trim(), out=$('positionsGrid');
  if(!wallet){ out.innerHTML='<div class="empty-tile">Enter a Solana wallet address first.</div>'; return; }
  $('walletBtn').disabled=true; $('walletBtn').textContent='Loading…'; out.innerHTML='<div class="empty-tile">Querying Panta read-only position data…</div>';
  const attempts=[
    ['positions',{wallet}], ['positions',{address:wallet}], [`wallets/${wallet}/positions`,{}], [`positions/${wallet}`,{}]
  ];
  let lastErr=null, data=null;
  for(const [path,params] of attempts){ try{ data=await api(path,params); break; }catch(e){ lastErr=e; if(e.status!==404 && e.status!==403) break; } }
  if(!data){ out.innerHTML=`<div class="empty-tile">Panta position lookup was not available for this address/API environment${lastErr?`: ${esc(lastErr.message)}`:''}.</div>`; }
  else {
    const rows=arrFrom(data);
    out.innerHTML=rows.length?rows.map((p,i)=>`<article class="position-card"><strong>Position ${i+1}</strong><br>${esc(String(p.marketTitle||p.title||p.market||p.marketId||'Market'))}<br>Side: ${esc(String(p.side||p.outcome||'—'))} · Size: ${esc(String(p.size||p.amount||p.shares||'—'))}</article>`).join(''):'<div class="empty-tile">Panta returned no open positions for this wallet.</div>';
  }
  $('walletBtn').disabled=false; $('walletBtn').textContent='Load positions';
}

$('refreshBtn').addEventListener('click',loadAll);
$('searchInput').addEventListener('input',renderMarkets);
$('categorySelect').addEventListener('change',renderMarkets);
$('sortSelect').addEventListener('change',renderMarkets);
$('showAllBtn').addEventListener('click',()=>{$('searchInput').value='';$('categorySelect').value='';renderMarkets();});
$('clearWatchBtn').addEventListener('click',()=>{state.watch.clear();syncWatch();});
$('walletBtn').addEventListener('click',loadPositions);
$('walletInput').addEventListener('keydown',e=>{if(e.key==='Enter')loadPositions();});

loadAll();