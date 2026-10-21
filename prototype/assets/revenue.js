/* ==========================================================================
   Platform revenue — what the platform OWNER earns and how it adds up.
   Spec: docs/15-platform-revenue.md.  All figures GHS, last 30 days, mock.
   Loaded after the main console script (shares its globals).
   ========================================================================== */
const REV = {
  plan:{Starter:6,Growth:9,Pro:12},      // GHS per student per term; recognised over 3 months
  months:3, feePct:0.005, provPct:0.010,  // platform take / aggregator fee on collections
  smsSeg:251000, waMsg:140000, smsPrice:0.05, smsCost:0.035, waPrice:0.03, waCost:0.02,
  ussdSessions:88400, ussdPrice:0.04, ussdCost:0.025,
  aiPilot:['GreenHill Academy','Bright Future Prep','Sunyani Royal School','Cape Coast Montessori'], aiOther:172, aiPrice:2.0, aiCost:0.55,
  otherStudents:16958, otherAvgPrice:8.40, otherSchools:35, totalStudents:21430, collections30:3240000,
  saasProcPct:0.015,                      // gateway fee on collecting SaaS invoices
  run:{infra:9800, tools:1900, support:6200},
  trend:{labels:['May','Jun','Jul','Aug','Sep','Oct'],
    subs:[.60,.68,.76,.84,.92,1], txn:[.9,.85,.5,.22,1.4,1], alerts:[.8,.75,.45,.2,1.3,1], ai:[0,0,.2,.45,.8,1], ussd:[.7,.7,.4,.15,1.25,1]},
  yoy:0.58
};
const STREAM_META = {
  subs:  {name:'Subscriptions',    color:'#0b6b53', ledger:'saas_revenue',          driver:'Students \u00d7 plan price \u00f7 3 months',
          formula:'Starter 6 \u00b7 Growth 9 \u00b7 Pro 12 GHS per student per term, recognised monthly. Trial and suspended schools excluded.'},
  txn:   {name:'Transaction fees', color:'#2f80ed', ledger:'platform_fee_revenue',  driver:'Digital collections \u00d7 0.50%',
          formula:'0.50% platform fee split off each successful payment at settlement. Aggregator\u2019s 1.00% is separate and borne by the school.'},
  alerts:{name:'Alert credits',    color:'#e0a100', ledger:'alert_wallet_usage',    driver:'Messages \u00d7 price (SMS 0.050, WhatsApp 0.030)',
          formula:'Schools prepay wallets; revenue is recognised when messages are sent. Cost is the SMS / WhatsApp provider rate.'},
  ai:    {name:'AI study add-on',  color:'#7c5cd6', ledger:'ai_addon_revenue',      driver:'Pilot students \u00d7 GHS 2.00 / month',
          formula:'Optional add-on per student per month. Cost is LLM usage (about GHS 0.55 per student per month, capped per school).'},
  ussd:  {name:'USSD sessions',    color:'#d6563b', ledger:'ussd_usage',            driver:'Sessions \u00d7 GHS 0.040',
          formula:'Per-session pass-through with a small margin over the telco / aggregator session charge (GHS 0.025).'}
};
const k$ = n => Math.abs(n)>=1000 ? 'GHS '+(n/1000).toFixed(1)+'k' : g0(n);
const spark = (vals,w=84,h=26,c='#0b6b53') => {
  const mx=Math.max(...vals),mn=Math.min(...vals),pts=vals.map((v,i)=>`${(i/(vals.length-1)*w).toFixed(1)},${(h-2-(v-mn)/(mx-mn||1)*(h-4)).toFixed(1)}`).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg>`;
};

function revModel(){
  const P=D.platform, L=livePays(), liveSum=L.reduce((a,p)=>a+p.amount,0)/100;
  const alertsBilled=REV.smsSeg*REV.smsPrice+REV.waMsg*REV.waPrice, alertsCost=REV.smsSeg*REV.smsCost+REV.waMsg*REV.waCost;
  const ussdBilled=REV.ussdSessions*REV.ussdPrice, ussdCost=REV.ussdSessions*REV.ussdCost;
  const rows=P.schools.map(s=>{
    const active=s.status==='Live'||s.status==='Trial', vol30=active?Math.round(s.vol*0.75):0;
    const demo=(s.name==='GreenHill Academy')?liveSum:0;
    const share=active?s.students/REV.totalStudents:0, pilot=REV.aiPilot.includes(s.name);
    return {id:s.id,name:s.name,city:s.city,plan:s.plan,students:s.students,status:s.status,inv:s.inv,
      sub:s.status==='Live'?s.students*REV.plan[s.plan]/REV.months:0, vol30:vol30+demo, demo,
      txn:(vol30+demo)*REV.feePct, alerts:alertsBilled*share, ussd:ussdBilled*share,
      ai:pilot?s.students*REV.aiPrice:0, aiCost:pilot?s.students*REV.aiCost:0, alertsCost:alertsCost*share, ussdCost:ussdCost*share};
  });
  const sum=k=>rows.reduce((a,r)=>a+r[k],0), baseVol=sum('vol30')-liveSum;
  const other={id:0,name:`Other ${REV.otherSchools} schools`,city:'aggregate',plan:'Mixed',students:REV.otherStudents,status:'Live',inv:'Paid',
    sub:REV.otherStudents*REV.otherAvgPrice/REV.months, vol30:Math.max(0,REV.collections30-baseVol), demo:0,
    alerts:alertsBilled-sum('alerts'), ussd:ussdBilled-sum('ussd'), ai:REV.aiOther*REV.aiPrice, aiCost:REV.aiOther*REV.aiCost,
    alertsCost:alertsCost-sum('alertsCost'), ussdCost:ussdCost-sum('ussdCost')};
  other.txn=other.vol30*REV.feePct; rows.push(other);
  const T=k=>rows.reduce((a,r)=>a+r[k],0);
  const subs=T('sub'), txn=T('txn'), al=T('alerts'), ai=T('ai'), us=T('ussd');
  const revenue=subs+txn+al+ai+us;
  const costs={alerts:T('alertsCost'),ussd:T('ussdCost'),llm:T('aiCost'),proc:subs*REV.saasProcPct};
  const pass=costs.alerts+costs.ussd+costs.llm+costs.proc, gp=revenue-pass, run=REV.run.infra+REV.run.tools+REV.run.support, contrib=gp-run;
  const collections=T('vol30');
  const streams=[
    {k:'subs',rev:subs,cost:costs.proc,inputs:`${num(REV.totalStudents)} students on ${num(P.schools.filter(s=>s.status==='Live').length+REV.otherSchools)} paying schools`},
    {k:'txn',rev:txn,cost:0,inputs:`${g0(collections)} collected \u00d7 0.50%${liveSum?` (incl. ${g0(liveSum)} live demo)`:''}`},
    {k:'alerts',rev:al,cost:costs.alerts,inputs:`${num(REV.smsSeg)} SMS segments \u00b7 ${num(REV.waMsg)} WhatsApp`},
    {k:'ai',rev:ai,cost:costs.llm,inputs:`${num(REV.aiPilot.reduce((a,n)=>a+P.schools.find(s=>s.name===n).students,0)+REV.aiOther)} pilot students`},
    {k:'ussd',rev:us,cost:costs.ussd,inputs:`${num(REV.ussdSessions)} sessions`}];
  const monthly=REV.trend.labels.map((l,i)=>({l,parts:{subs:subs*REV.trend.subs[i],txn:(txn-liveSum*REV.feePct)*REV.trend.txn[i]+liveSum*REV.feePct*(i===5?1:0),alerts:al*REV.trend.alerts[i],ai:ai*REV.trend.ai[i],ussd:us*REV.trend.ussd[i]}}));
  monthly.forEach(m=>m.total=Object.values(m.parts).reduce((a,b)=>a+b,0));
  return {rows,streams,revenue,subs,txn,al,ai,us,costs,pass,gp,run,contrib,collections,liveSum,liveFee:liveSum*REV.feePct,liveCount:L.length,monthly,
    recurring:subs+ai, arr:(subs+ai)*12, arps:revenue/(P.schools.filter(s=>s.status==='Live'||s.status==='Trial').length+REV.otherSchools)};
}

/* ---------- Overview strip ---------- */
function revenueStrip(){
  const m=revModel(), parts=m.streams.map(s=>({k:s.k,v:s.rev}));
  const sep=m.monthly[4].total, mom=(m.revenue/sep-1)*100;
  return `<div class="card" style="padding:0;overflow:hidden">
   <div style="display:grid;grid-template-columns:1.2fr 2fr auto;gap:0;align-items:stretch">
    <div style="padding:16px 20px;border-right:1px solid var(--line)">
      <div class="eyebrow">Platform revenue \u00b7 last 30 days</div>
      <div style="font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1.1">${g0(m.revenue)}</div>
      <div class="note" style="margin-top:6px"><span style="color:${mom<0?'var(--warn)':'var(--ok)'};font-weight:650">${mom<0?'\u2193':'\u2191'} ${Math.abs(mom).toFixed(1)}%</span> vs Sep (term-start peak) \u00b7 <span style="color:var(--ok);font-weight:650">+${Math.round(REV.yoy*100)}%</span> YoY</div>
      ${m.liveCount?`<div class="chip ok" style="margin-top:10px">+${g0(m.liveFee)} platform fee from live demo payments</div>`:''}
    </div>
    <div style="padding:16px 20px">
      <div class="eyebrow">Where it comes from</div>
      <div style="display:flex;height:10px;border-radius:99px;overflow:hidden;margin:8px 0 12px;background:var(--line-2)">${parts.map(p=>`<i title="${STREAM_META[p.k].name}" style="width:${p.v/m.revenue*100}%;background:${STREAM_META[p.k].color}"></i>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${parts.map(p=>`<div><div style="font-size:11.5px;color:var(--muted)"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${STREAM_META[p.k].color};margin-right:6px"></i>${STREAM_META[p.k].name}</div><div style="font-weight:650;margin-top:2px">${k$(p.v)}</div><div class="note">${pct(p.v,m.revenue)}%</div></div>`).join('')}</div>
    </div>
    <div style="padding:16px 20px;border-left:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;min-width:220px;background:var(--surface-2)">
      <div><div class="kv" style="padding:3px 0"><span>Gross margin</span><b>${pct(m.gp,m.revenue)}%</b></div><div class="kv" style="padding:3px 0"><span>Contribution</span><b>${k$(m.contrib)}</b></div><div class="kv" style="padding:3px 0;border:0"><span>ARR run-rate</span><b>${k$(m.arr)}</b></div></div>
      <button class="btn sm" data-go="platform:revenue" style="margin-top:10px">See how it adds up \u2192</button>
    </div></div></div>`;
}

/* ---------- charts ---------- */
function waterfall(steps,w=860,h=250){
  const mx=Math.max(...steps.map(s=>Math.max(s.from??0,s.to)))*1.12, bw=62, gap=(w-60-steps.length*bw)/(steps.length-1), y0=h-52, sc=(y0-26)/mx;
  let out=`<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">`;
  steps.forEach((s,i)=>{
    const x=30+i*(bw+gap), top=Math.min(s.from??0,s.to), bot=Math.max(s.from??0,s.to), y=y0-bot*sc, hh=Math.max(2,(bot-top)*sc);
    const col=s.type==='total'?'#0f172a':s.type==='down'?'#d92d20':'#0b6b53';
    out+=`<rect x="${x}" y="${y}" width="${bw}" height="${hh}" rx="5" fill="${col}" opacity="${s.type==='total'?1:.88}"/>`;
    out+=`<text x="${x+bw/2}" y="${y-7}" text-anchor="middle" font-size="11.5" font-weight="650" fill="#0f172a">${s.type==='down'?'\u2212':''}${k$(s.v)}</text>`;
    s.label.split('|').forEach((t,j)=>out+=`<text x="${x+bw/2}" y="${y0+17+j*13}" text-anchor="middle" font-size="11" fill="#64748b">${t}</text>`);
    if(i<steps.length-1) out+=`<line x1="${x+bw}" x2="${x+bw+gap}" y1="${y0-s.to*sc}" y2="${y0-s.to*sc}" stroke="#cbd5e1" stroke-dasharray="3 3"/>`;
  });
  return out+`<line x1="20" x2="${w-20}" y1="${y0}" y2="${y0}" stroke="#e6e8ec"/></svg>`;
}
function stacked(monthly,h=170){
  const w=monthly.length*86+20, mx=Math.max(...monthly.map(m=>m.total))*1.12, keys=Object.keys(STREAM_META);
  return `<svg viewBox="0 0 ${w} ${h+30}" width="100%">${monthly.map((m,i)=>{let y=h;const x=14+i*86;
    const segs=keys.map(k=>{const bh=m.parts[k]/mx*h;y-=bh;return `<rect x="${x}" y="${y}" width="52" height="${Math.max(0,bh)}" fill="${STREAM_META[k].color}"/>`;}).join('');
    return `<g>${segs}<text x="${x+26}" y="${y-6}" text-anchor="middle" font-size="11" font-weight="650" fill="#0f172a">${k$(m.total)}</text><text x="${x+26}" y="${h+18}" text-anchor="middle" font-size="11" fill="#64748b">${m.l}</text></g>`;}).join('')}</svg>`;
}

/* ---------- funds-flow calculator ---------- */
function calcHtml(){
  const c=ui.calc||(ui.calc={amt:500,bearer:'school'}), A=+c.amt||0, prov=A*REV.provPct, plat=A*REV.feePct;
  const pays=c.bearer==='parent'?A+prov+plat:A, school=c.bearer==='parent'?A:A-prov-plat;
  const row=(l,v,hl,sub)=>`<div class="kv" style="${hl?'background:var(--brand-50);margin:2px -10px;padding:9px 10px;border-radius:8px;border:0':''}"><span style="${hl?'color:var(--brand);font-weight:650':''}">${l}${sub?`<small class="note" style="display:block">${sub}</small>`:''}</span><b style="${hl?'color:var(--brand)':''}">GHS ${v.toLocaleString('en-GH',{minimumFractionDigits:2,maximumFractionDigits:2})}</b></div>`;
  return `${row('Parent pays',pays)}${row('Aggregator / network fee (1.00%)',prov,false,'Paid to the payment aggregator, not to EsmPay')}${row('EsmPay platform fee (0.50%)',plat,true,'Platform owner revenue \u2192 ledger: platform_fee_revenue')}${row('School receives (T+1)',school,false,'Settled to the school\u2019s verified account')}
  <div class="note" style="margin-top:10px">Ledger: <code>Dr provider_clearing ${pays.toFixed(2)}</code> \u00b7 <code>Cr student_receivable ${A.toFixed(2)}</code> \u00b7 fee lines post separately so each step is reversible.</div>`;
}

/* ---------- Revenue page ---------- */
PAGES.revenue=()=>{
  const m=revModel(), open=ui.revOpen||(ui.revOpen={}), sep=m.monthly[4].total, mom=(m.revenue/sep-1)*100;
  const conc=[...m.rows].sort((a,b)=>(b.sub+b.txn+b.alerts+b.ai+b.ussd)-(a.sub+a.txn+a.alerts+a.ai+a.ussd));
  const tot=r=>r.sub+r.txn+r.alerts+r.ai+r.ussd;
  const top3=conc.filter(r=>r.id!==0).slice(0,3), top3sum=top3.reduce((a,r)=>a+tot(r),0);
  const listed=D.platform.schools, deferred=listed.reduce((a,s)=>a+s.wallet,0);
  const atRisk=listed.filter(s=>s.inv==='Overdue'||s.status==='Suspended'), pipeline=listed.filter(s=>s.status==='Onboarding'||s.status==='Trial');
  const atRiskAmt=atRisk.reduce((a,s)=>a+s.students*REV.plan[s.plan]/REV.months,0);
  const pipeAmt=pipeline.reduce((a,s)=>a+s.students*REV.plan[s.plan]/REV.months,0);
  const wf=[
    {label:'Subscrip-|tions',v:m.subs,from:0,to:m.subs,type:'up'},
    {label:'Transaction|fees',v:m.txn,from:m.subs,to:m.subs+m.txn,type:'up'},
    {label:'Alert|credits',v:m.al,from:m.subs+m.txn,to:m.subs+m.txn+m.al,type:'up'},
    {label:'AI|add-on',v:m.ai,from:m.subs+m.txn+m.al,to:m.subs+m.txn+m.al+m.ai,type:'up'},
    {label:'USSD|sessions',v:m.us,from:m.subs+m.txn+m.al+m.ai,to:m.revenue,type:'up'},
    {label:'Net|revenue',v:m.revenue,from:0,to:m.revenue,type:'total'},
    {label:'Message &|session costs',v:m.costs.alerts+m.costs.ussd,from:m.revenue,to:m.revenue-m.costs.alerts-m.costs.ussd,type:'down'},
    {label:'LLM &|payment fees',v:m.costs.llm+m.costs.proc,from:m.revenue-m.costs.alerts-m.costs.ussd,to:m.gp,type:'down'},
    {label:'Gross|profit',v:m.gp,from:0,to:m.gp,type:'total'},
    {label:'Cloud &|tools',v:REV.run.infra+REV.run.tools,from:m.gp,to:m.gp-REV.run.infra-REV.run.tools,type:'down'},
    {label:'Support &|onboarding',v:REV.run.support,from:m.gp-REV.run.infra-REV.run.tools,to:m.contrib,type:'down'},
    {label:'Contri-|bution',v:m.contrib,from:0,to:m.contrib,type:'total'}];
  return `<div class="head"><div><h1>Platform revenue</h1><div class="sub">What EsmPay earns, and exactly how it adds up \u00b7 last 30 days \u00b7 GHS</div></div><div class="sp"></div>
    <button class="btn line" data-act="toast" data-m="Revenue statement exported (demo)">Export statement</button></div>
  ${m.liveCount?`<div class="banner ok"><div><b>Live:</b> ${m.liveCount} payment${m.liveCount>1?'s':''} from the parent app (${g0(m.liveSum)}) earned the platform <b>${fm(Math.round(m.liveFee*100))}</b> in fees. Transaction fees below include it.</div></div>`:''}
  <div class="kpis">
    <div class="kpi"><span>Net revenue</span><b>${g0(m.revenue)}</b><small class="${mom<0?'':'up'}">${mom<0?'\u2193':'\u2191'} ${Math.abs(mom).toFixed(1)}% vs Sep \u00b7 +${Math.round(REV.yoy*100)}% YoY</small>${spark(m.monthly.map(x=>x.total))}</div>
    <div class="kpi"><span>Gross profit</span><b>${g0(m.gp)}</b><small class="up">${pct(m.gp,m.revenue)}% gross margin</small></div>
    <div class="kpi"><span>Contribution</span><b>${g0(m.contrib)}</b><small>${pct(m.contrib,m.revenue)}% after run costs</small></div>
    <div class="kpi"><span>Recurring (subs + AI)</span><b>${g0(m.recurring)}</b><small>${pct(m.recurring,m.revenue)}% of revenue \u00b7 ARR ${k$(m.arr)}</small></div>
    <div class="kpi"><span>Revenue per school</span><b>${g0(m.arps)}</b><small>${g0(m.revenue/REV.totalStudents*1000)}\u200a/\u200a1,000 students</small></div>
    <div class="kpi"><span>Take rate on collections</span><b>0.50%</b><small>${g0(m.collections)} processed</small></div>
  </div>

  <div class="card"><h3>How it adds up <span class="sp"></span><span class="chip neutral">Revenue \u2192 gross profit \u2192 contribution</span></h3>
    ${waterfall(wf)}
    <p class="note" style="margin-top:6px">Engineering payroll and founder costs are excluded. \u201cContribution\u201d is what the platform keeps after variable and run costs, before team costs.</p></div>

  <div class="card flush"><h3>Revenue by stream <span class="note" style="font-weight:500">\u00b7 click a row for the formula</span></h3>
   <table class="tbl" style="margin-top:10px"><thead><tr><th>Stream</th><th>Driver</th><th class="r">Revenue</th><th class="r">Direct cost</th><th class="r">Margin</th><th style="width:150px">Share</th></tr></thead><tbody>
   ${m.streams.map(s=>{const M=STREAM_META[s.k], isOpen=open[s.k], mg=s.rev-s.cost;
     return `<tr class="click" data-revrow="${s.k}"><td><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${M.color};margin-right:9px"></span><b>${M.name}</b></td><td>${M.driver}<small>${s.inputs}</small></td><td class="r"><b>${g0(s.rev)}</b></td><td class="r">${s.cost?g0(s.cost):'\u2014'}</td><td class="r">${g0(mg)} <small>${pct(mg,s.rev)}%</small></td>
     <td><div class="prog"><i style="width:${s.rev/m.revenue*100}%;background:${M.color}"></i></div><small>${pct(s.rev,m.revenue)}%</small></td></tr>
     ${isOpen?`<tr><td colspan="6" style="background:var(--surface-2);padding:14px 18px"><div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:20px"><div><div class="eyebrow">Formula</div>${M.formula}</div><div><div class="eyebrow">Inputs</div>${s.inputs}</div><div><div class="eyebrow">Ledger account</div><code>${M.ledger}</code></div></div></td></tr>`:''}`}).join('')}
   <tr class="total"><td>Net revenue</td><td></td><td class="r">${g0(m.revenue)}</td><td class="r">${g0(m.pass)}</td><td class="r">${g0(m.gp)} <small>${pct(m.gp,m.revenue)}%</small></td><td></td></tr></tbody></table></div>

  <div class="two">
   <div class="card"><h3>Follow a payment <span class="sp"></span><span class="chip blue">Money in vs revenue</span></h3>
    <div style="display:flex;gap:10px;margin-bottom:12px;align-items:center"><div class="field" style="margin:0;width:150px"><label>Parent pays (GHS)</label><input class="in" id="rc-amt" inputmode="decimal" value="${ui.calc?ui.calc.amt:500}"></div>
     <div class="field" style="margin:0;flex:1"><label>Who bears the transaction fee?</label><select class="in" id="rc-b"><option value="school" ${ui.calc&&ui.calc.bearer==='school'?'selected':''}>School absorbs (default)</option><option value="parent" ${ui.calc&&ui.calc.bearer==='parent'?'selected':''}>Parent pays a convenience fee</option></select></div></div>
    <div id="rc-out">${calcHtml()}</div></div>
   <div class="card"><h3>Revenue mix</h3><div style="display:flex;align-items:center;gap:22px">${donut(m.streams.map(s=>({v:s.rev,c:STREAM_META[s.k].color})),140)}
     <div class="legend">${m.streams.map(s=>`<span><i style="background:${STREAM_META[s.k].color}"></i>${STREAM_META[s.k].name} \u00b7 ${pct(s.rev,m.revenue)}%</span>`).join('')}</div></div>
     <div class="kv" style="margin-top:14px"><span>Top 3 schools</span><b>${pct(top3sum,m.revenue)}% of revenue</b></div><div class="kv"><span>Largest school</span><b>${top3[0].name}</b></div></div></div>

  <div class="card"><h3>Six-month trend <span class="sp"></span><span class="note" style="font-weight:500">Seasonal: term-start spike in September, August holidays dip</span></h3>
    <div style="display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center">${stacked(m.monthly)}<div class="legend">${Object.entries(STREAM_META).map(([k,M])=>`<span><i style="background:${M.color}"></i>${M.name}</span>`).join('')}</div></div></div>

  <div class="card flush"><h3>Contribution by school <span class="note" style="font-weight:500">\u00b7 last 30 days</span></h3>
   <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>School</th><th>Plan</th><th class="r">Students</th><th class="r">Subscription</th><th class="r">Txn fees</th><th class="r">Alerts + USSD</th><th class="r">AI</th><th class="r">Total</th><th style="width:110px">Share</th></tr></thead><tbody>
   ${conc.map(r=>`<tr><td><b>${r.name}</b><small>${r.city}${r.status!=='Live'?' \u00b7 '+r.status:''}${r.demo?' \u00b7 incl. live demo':''}</small></td><td>${r.plan}</td><td class="r">${num(r.students)}</td><td class="r">${r.sub?g0(r.sub):'\u2014'}</td><td class="r">${r.txn?g0(r.txn):'\u2014'}</td><td class="r">${(r.alerts+r.ussd)?g0(r.alerts+r.ussd):'\u2014'}</td><td class="r">${r.ai?g0(r.ai):'\u2014'}</td><td class="r"><b>${g0(tot(r))}</b></td><td><div class="prog"><i style="width:${tot(r)/tot(conc[0])*100}%"></i></div><small>${pct(tot(r),m.revenue)}%</small></td></tr>`).join('')}
   <tr class="total"><td>Total</td><td></td><td class="r">${num(m.rows.reduce((a,r)=>a+r.students,0))}</td><td class="r">${g0(m.subs)}</td><td class="r">${g0(m.txn)}</td><td class="r">${g0(m.al+m.us)}</td><td class="r">${g0(m.ai)}</td><td class="r">${g0(m.revenue)}</td><td></td></tr></tbody></table></div></div>

  <div class="three">
   <div class="card"><h3>Revenue at risk</h3><div style="font-size:24px;font-weight:650">${g0(atRiskAmt)}<span class="note"> / month</span></div>${atRisk.map(s=>`<div class="kv"><span>${s.name}</span><span class="chip bad">${s.inv}</span></div>`).join('')||'<div class="note">None</div>'}<p class="note" style="margin-top:10px">Suspended for an overdue SaaS invoice; its transaction fees are paused until reactivated.</p></div>
   <div class="card"><h3>Pipeline (not yet billing)</h3><div style="font-size:24px;font-weight:650">${g0(pipeAmt)}<span class="note"> / month on conversion</span></div>${pipeline.map(s=>`<div class="kv"><span>${s.name}</span><span class="chip ${s.status==='Trial'?'blue':'neutral'}">${s.status}</span></div>`).join('')}</div>
   <div class="card"><h3>Deferred revenue</h3><div style="font-size:24px;font-weight:650">${g0(deferred)}</div><p class="note" style="margin-top:6px">Prepaid alert credit held in school wallets. Recognised as revenue only when messages are sent.</p><div class="kv"><span>Schools with wallet &lt; GHS 25</span><b>${listed.filter(s=>s.wallet<25&&s.status!=='Onboarding').length}</b></div></div></div>

  <div class="card"><h3>Where the money lands</h3>
   <table class="tbl"><thead><tr><th>Revenue</th><th>Collected how</th><th>Ledger account</th><th>Paid to owner</th></tr></thead><tbody>
   <tr><td>Subscriptions</td><td>SaaS invoice to school, collected via MoMo / bank</td><td><code>saas_revenue</code></td><td>On collection</td></tr>
   <tr><td>Transaction fees</td><td>Split off each payment at the aggregator</td><td><code>platform_fee_revenue</code></td><td>Daily with settlement (T+1)</td></tr>
   <tr><td>Alert credits</td><td>Prepaid wallet top-ups</td><td><code>alert_wallet_usage</code></td><td>Cash at top-up; revenue at send</td></tr>
   <tr><td>AI add-on / USSD</td><td>Billed on the monthly SaaS invoice</td><td><code>ai_addon_revenue</code>, <code>ussd_usage</code></td><td>With the SaaS invoice</td></tr></tbody></table></div>`;
};

/* ---------- interactions for this page ---------- */
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-revrow]'); if(r){ (ui.revOpen||(ui.revOpen={}))[r.dataset.revrow]=!(ui.revOpen||{})[r.dataset.revrow]; render(); }
  const t=e.target.closest('[data-act="toast"]'); if(t) toast(t.dataset.m);
});
document.addEventListener('input',e=>{
  if(e.target.id==='rc-amt'){ (ui.calc||(ui.calc={amt:500,bearer:'school'})).amt=e.target.value; $('#rc-out').innerHTML=calcHtml(); }
});
document.addEventListener('change',e=>{
  if(e.target.id==='rc-b'){ (ui.calc||(ui.calc={amt:500,bearer:'school'})).bearer=e.target.value; $('#rc-out').innerHTML=calcHtml(); }
});
