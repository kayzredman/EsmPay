/* ==========================================================================
   Service map — live, animated view of every service, gateway and external
   dependency, from the parent's phone to the school's bank (the "last mile").
   Spec: docs/16-service-map-observability.md
   ========================================================================== */
(function(){
const FL={W:1300,H:770,NW:140,NH:54,COLX:[30,250,470,690,910,1130]};
const LANES=['Channels','Telco & edge','Application','Core services & data','External providers','Last mile'];
const KCOL={channel:'#64748b',edge:'#0f766e',app:'#0b6b53',core:'#1d4ed8',data:'#6d28d9',ext:'#b45309',last:'#0f172a'};
const SCOL={ok:'#22a45d',warn:'#e0a100',down:'#d92d20'}, RANK={ok:0,warn:1,down:2}, RNAME=['ok','warn','down'];

/* ---------------- topology ---------------- */
const N=(id,name,sub,col,y,kind,base,about,extra={})=>({id,name,sub,col,y,kind,base,about,h:extra.h||FL.NH,x:FL.COLX[col]});
const NODES=[
 N('web','Parent web app','PWA \u00b7 OTP login',0,100,'channel',{rps:22},'Guardians and students use the PWA over HTTPS. Works on 3G with a low-data mode.'),
 N('staff','School & platform consoles','Heads \u00b7 bursars \u00b7 teachers',0,250,'channel',{rps:6},'Staff consoles for fees, grades, messaging and platform administration.'),
 N('ussd_user','Feature phone','Dials *714#',0,420,'channel',{rps:9},'Any phone, any network. Identified by MSISDN; PIN for money actions.'),
 N('edge','CDN \u00b7 WAF \u00b7 LB','TLS \u00b7 rate limits',1,175,'edge',{rps:46,lat:12},'Edge protection and routing for web, console and webhook traffic. Bot rules guard the OTP endpoints.'),
 N('mno','Telco USSD gateway','MTN \u00b7 Telecel \u00b7 AT',1,420,'ext',{rps:9,lat:140},'The mobile networks\u2019 USSD gateways. Sessions time out in 30\u2013120 s; each screen must answer in under ~2 s.'),
 N('webapp','Web app','Next.js \u00b7 SSR',2,100,'app',{rps:22,lat:95},'Server-rendered parent and staff UI.'),
 N('api','Core API','Modular monolith',2,250,'app',{rps:58,lat:180},'Tenant-scoped REST API: people, fees, academics, comms. Enforces RBAC and row-level security.'),
 N('ussdsvc','USSD service','Stateless \u00b7 < 2 s',2,420,'app',{rps:9,lat:420},'Stateless handler with session state in Redis. Never waits on a payment inside the session.'),
 N('hooks','Webhook receiver','Raw inbox \u00b7 idempotent',3,40,'app',{rps:3,lat:40},'Stores every provider callback raw, verifies the signature, acknowledges fast, processes asynchronously.'),
 N('pay','Payments & ledger','Double-entry',3,145,'core',{rps:4.2,lat:260},'Payment intents, allocation and the immutable ledger. Idempotent on provider transaction id.'),
 N('alert','Alert service','Router \u00b7 fallback \u00b7 wallet',3,250,'core',{rps:14,lat:60},'Chooses the channel (WhatsApp / SMS / email), applies consent and quiet hours, falls back automatically and tracks cost.'),
 N('workers','Workers & queues','BullMQ \u00b7 outbox',3,355,'core',{rps:31,lat:35},'Relays outbox events to alerts, AI, reports, imports and reconciliation. Priority queue for payments and OTP.'),
 N('ai','AI study service','Rules \u00b7 risk \u00b7 narratives',3,460,'core',{rps:0.8,lat:900},'Computes progress insights and drafts narratives. Falls back to templates if the LLM is unavailable.'),
 N('pg','PostgreSQL','RLS \u00b7 PITR',3,565,'data',{rps:140,lat:6},'System of record. Tenant isolation by row-level security. Point-in-time recovery.'),
 N('redis','Redis','Sessions \u00b7 queues',3,670,'data',{rps:210,lat:1},'USSD sessions, job queues, rate limiting and short-lived OTPs.'),
 N('agg','Payment aggregator','MoMo collections',4,95,'ext',{rps:4.1,lat:640},'Request-to-pay, webhooks, status API and split settlement. Single provider behind a port, replaceable.'),
 N('sms1','SMS provider 1','',4,215,'ext',{rps:9,lat:220},'SMS route with delivery receipts.'),
 N('sms2','SMS provider 2','',4,295,'ext',{rps:1.2,lat:260},'SMS route with delivery receipts.'),
 N('wap','WhatsApp Cloud API','Utility templates',4,375,'ext',{rps:5,lat:180},'Business-initiated utility templates; 24 h service window for replies.'),
 N('mail','Email provider','SPF \u00b7 DKIM',4,455,'ext',{rps:0.8,lat:400},'PDFs, statements and digests.'),
 N('llm','LLM provider','Narratives only',4,565,'ext',{rps:0.4,lat:1400},'Receives structured, minimised facts only. Output is fact-checked before use.'),
 N('bank','School settlement','Bank / MoMo \u00b7 T+1',5,60,'last',{rps:0.02},'Net funds land directly with the school; platform fee is split off at the aggregator.'),
 N('momo','MoMo networks','Approval prompt',5,165,'ext',{rps:4,lat:900},'The payer approves the request with their MoMo PIN.'),
 N('handset','Parent handset','SMS \u00b7 WhatsApp \u00b7 email',5,330,'last',{rps:14},'The last mile: receipts, results alerts and weekly digests reach the guardian here.',{h:96})
];
NODES.find(n=>n.id==='handset').h=96;
const NM=Object.fromEntries(NODES.map(n=>[n.id,n]));
const E=(a,b,lat,w,what)=>({id:a+'>'+b,a,b,lat,w,what});
const EDGES=[
 E('web','edge',45,.9,'HTTPS'),E('staff','edge',40,.5,'HTTPS'),E('edge','webapp',12,.9,'Page / asset'),E('edge','api',15,.9,'API'),E('webapp','api',18,.8,'Server fetch'),
 E('ussd_user','mno',120,.7,'USSD dial'),E('mno','ussdsvc',180,.7,'Session callback'),E('ussdsvc','api',25,.6,'Lookup / intent'),E('ussdsvc','redis',3,.7,'Session state'),
 E('api','redis',3,.8,'Cache / limits'),E('api','pg',8,.9,'SQL'),E('api','pay',20,.5,'Create intent'),E('api','workers',6,.7,'Outbox'),
 E('pay','agg',650,.5,'Request-to-pay'),E('agg','momo',900,.5,'Push prompt'),E('momo','handset',1800,.45,'Approval prompt'),
 E('agg','hooks',700,.45,'Webhook'),E('hooks','pay',25,.45,'Post to ledger'),E('pay','alert',15,.5,'Receipt event'),E('workers','alert',20,.7,'Notify job'),
 E('alert','sms1',220,.6,'Send SMS'),E('alert','sms2',260,.6,'Send SMS'),E('alert','wap',180,.6,'Send template'),E('alert','mail',400,.25,'Send email'),
 E('sms1','handset',3200,.6,'SMS delivery'),E('sms2','handset',3600,.6,'SMS delivery'),E('wap','handset',1800,.6,'WhatsApp delivery'),E('mail','handset',5000,.25,'Email delivery'),
 E('workers','ai',40,.35,'Features'),E('ai','llm',1400,.3,'Narrative'),E('ai','pg',10,.35,'Insights'),E('agg','bank',0,.2,'Split settlement')
];
const EM=Object.fromEntries(EDGES.map(e=>[e.id,e]));

/* ---------------- critical paths ---------------- */
const PATHS=[
 {id:'ussd',name:'USSD payment',desc:'*714# \u2192 MoMo prompt \u2192 SMS receipt',slo:10000,
  steps:['ussd_user>mno','mno>ussdsvc','ussdsvc>api','api>pay','pay>agg','agg>momo','momo>handset','agg>hooks','hooks>pay','pay>alert',{alt:'sms'}],
  impact:'Parents cannot pay by USSD; web and cash payments continue.'},
 {id:'web',name:'Web payment',desc:'PWA \u2192 MoMo prompt \u2192 receipt',slo:10000,
  steps:['web>edge','edge>webapp','webapp>api','api>pay','pay>agg','agg>momo','momo>handset','agg>hooks','hooks>pay','pay>alert',{alt:'notify'}],
  impact:'Online payments paused; USSD and cash payments continue.'},
 {id:'results',name:'Results \u2192 parents',desc:'Head publishes \u2192 guardians notified',slo:15000,
  steps:['staff>edge','edge>api','api>workers','workers>alert',{alt:'notify'}],
  impact:'Results are published but guardians are not alerted; they can still view them in the app.'},
 {id:'settle',name:'Settlement \u2192 school',desc:'Approved batch \u2192 school account (T+1)',slo:null,
  steps:['staff>edge','edge>api','api>pay','pay>agg','agg>bank'],
  impact:'Payouts are held (not lost) until the aggregator recovers; funds stay safe in the ledger.'},
 {id:'ai',name:'AI insight \u2192 parent',desc:'Features \u2192 narrative \u2192 teacher approval \u2192 digest',slo:20000,soft:['llm'],
  steps:['api>workers','workers>ai','ai>llm','ai>pg','staff>edge','edge>api','workers>alert',{alt:'notify'}],
  impact:'Parents miss the weekly digest; no effect on payments or results.'}
];

/* ---------------- incident catalogue ---------------- */
const FAULTS={
 sms1:{title:'SMS Provider 1 degraded',sev:'warn',eff:{sms1:'warn'},prov:{sms1:'Degraded'},
   impact:'Delivery rate 91% (threshold 95%); receipts delayed by about 4 s.',fix:'Alert router shifted ~70% of SMS to Provider 2 automatically.'},
 sms1_down:{title:'SMS Provider 1 outage',sev:'warn',eff:{sms1:'down'},prov:{sms1:'Down'},
   impact:'No SMS can leave via Provider 1.',fix:'100% of SMS rerouted to Provider 2; OTP and receipts unaffected.'},
 sms_all:{title:'All SMS providers down',sev:'crit',eff:{sms1:'down',sms2:'down'},prov:{sms1:'Down',sms2:'Down'},
   impact:'No SMS receipts or OTP codes. USSD users get no receipt; guardians fall back to WhatsApp / email.',fix:'Messages queue with retry and backoff; on-call paged; WhatsApp-first mode enabled.'},
 agg_down:{title:'Payment aggregator outage',sev:'crit',eff:{agg:'down',pay:'warn',hooks:'warn'},prov:{pay:'Down'},
   impact:'MoMo prompts cannot be sent. Web and USSD payments fail fast with a clear message.',fix:'Payments paused with a friendly status; bursar manual payments still work; reconciliation heals the gap.'},
 agg_slow:{title:'Aggregator callbacks delayed (8 min)',sev:'warn',eff:{agg:'warn',hooks:'warn'},prov:{pay:'Degraded'},
   impact:'Receipts lag; some payment intents stay \u201cunknown\u201d.',fix:'Status-check polling resolves intents; daily reconciliation is the safety net.'},
 pg_failover:{title:'PostgreSQL primary failover',sev:'crit',auto:true,eff:{pg:'down',api:'warn',pay:'warn',alert:'warn',workers:'warn',ussdsvc:'warn'},prov:{},
   impact:'About 15 s of read-only mode while the replica is promoted.',fix:'Automatic failover; writes retry with idempotency keys; no data loss (RPO \u2264 5 min).'},
 redis_down:{title:'Redis unavailable',sev:'crit',eff:{redis:'down',ussdsvc:'down',api:'warn',workers:'warn'},prov:{},
   impact:'USSD sessions cannot be stored (\u201cService busy\u201d). Rate limits fail open; queues stall.',fix:'Managed failover; USSD sheds load; workers retry with backoff.'},
 mno_slow:{title:'Telco USSD gateway latency',sev:'warn',eff:{mno:'warn',ussdsvc:'warn'},prov:{ussd:'Degraded'},
   impact:'USSD screens exceed 3 s; drop-offs rise.',fix:'Session-resume prompt on redial; escalated to aggregator; web and WhatsApp unaffected.'},
 wa_limit:{title:'WhatsApp API rate-limited',sev:'warn',eff:{wap:'warn'},prov:{wa:'Degraded'},
   impact:'WhatsApp sends are throttled.',fix:'Router falls back to SMS for the overflow.'},
 llm_down:{title:'LLM provider timeouts',sev:'warn',eff:{llm:'down',ai:'warn'},prov:{},
   impact:'AI narratives unavailable.',fix:'Template text is used; insights are still computed; no parent-facing breakage.'},
 edge_spike:{title:'Traffic spike at the edge (results day)',sev:'warn',eff:{edge:'warn',webapp:'warn',api:'warn'},prov:{},
   impact:'p95 latency 2.4\u00d7 baseline; WAF rate-limiting bots.',fix:'Autoscaling web and API; non-critical jobs shed; payments keep queue priority.'}
};
const NODE_FAULTS={sms1:['sms1','sms1_down','sms_all'],sms2:['sms_all'],agg:['agg_down','agg_slow'],hooks:['agg_slow'],pay:['agg_down'],pg:['pg_failover'],redis:['redis_down'],ussdsvc:['redis_down','mno_slow'],mno:['mno_slow'],wap:['wa_limit'],llm:['llm_down'],ai:['llm_down'],edge:['edge_spike'],webapp:['edge_spike'],api:['edge_spike','pg_failover'],alert:['sms_all','wa_limit']};

/* ---------------- state ---------------- */
const REDUCE=window.matchMedia('(prefers-reduced-motion: reduce)');
const FS={faults:{},log:[],sel:null,path:null,paused:false,parts:[],acc:{},timers:[],queue:0,t:0,m:{}};
function addLog(kind,text,ts){FS.log.unshift({kind,text,ts:ts||Date.now()});FS.log=FS.log.slice(0,40);}
function initFaults(){
  FS.faults={};FS.log=[];FS.queue=0;FS.timers.forEach(clearTimeout);FS.timers=[];
  FS.faults.sms1={id:'sms1',since:Date.now()-31*60000,cur:FAULTS.sms1.eff};
  addLog('open','Incident opened: SMS Provider 1 delivery rate fell below 95%',Date.now()-31*60000);
  addLog('mit','Auto-mitigation: alert router shifted ~70% of SMS to Provider 2',Date.now()-30*60000);
  addLog('info','Status page updated: \u201cSMS delivery may be delayed\u201d',Date.now()-29*60000);
}
initFaults();
const activeIds=()=>Object.keys(FS.faults);
window.activeIncidents=()=>activeIds().map(id=>({id,title:FAULTS[id].title,sev:FAULTS[id].sev,since:FS.faults[id].since}));
window.incidentBanner=()=>{
  const a=window.activeIncidents(); if(!a.length) return '';
  const crit=a.some(i=>i.sev==='crit');
  return `<div class="banner ${crit?'bad':'warn'}"><span class="dot ${crit?'bad pulse':'warn'}"></span><div><b>${a.length} active incident${a.length>1?'s':''}:</b> ${a.map(i=>i.title).join(' \u00b7 ')}</div><span class="sp"></span><button class="btn sm" data-go="platform:flow">Open service map</button></div>`;
};
window.flowSync=function(){ // keep the Providers page consistent with the service map
  const P=D.platform.providers; P.forEach(p=>{p.status='Operational';});
  const lat={Degraded:2.6,Down:null};
  activeIds().forEach(id=>{const f=FAULTS[id];Object.entries(f.prov||{}).forEach(([k,st])=>{const p=P.find(x=>x.k===k);if(!p)return;
    if(st==='Down'||(st==='Degraded'&&p.status!=='Down'))p.status=st;});});
  P.forEach(p=>{const base={pay:['1.2 s','94.2%'],sms1:['2.2 s','97.4%'],sms2:['2.1 s','97.6%'],wa:['0.9 s','98.4%'],em:['0.6 s','99.1%'],ussd:['1.4 s p95','96.3%']}[p.k];
    if(p.status==='Operational'){p.lat=base[0];p.ok=base[1];}else if(p.status==='Degraded'){p.lat='4.8 s';p.ok='91.0%';}else{p.lat='timeout';p.ok='0%';}});
};
window.flowReset=function(){initFaults();window.flowSync();FS.sel=null;FS.path=null;};
window.flowSync();

/* ---------------- health model ---------------- */
function nodeStatus(id,soft){
  let r=0;activeIds().forEach(f=>{const s=FS.faults[f].cur[id];if(s)r=Math.max(r,RANK[s]);});
  if(soft&&soft.includes(id)&&r===2)r=1; return RNAME[r];
}
function edgeStatus(e){return RNAME[Math.max(RANK[nodeStatus(e.a)],RANK[nodeStatus(e.b)])];}
function smsOrder(){const p=D.platform.smsPrimary;return p==='sms2'?['sms2','sms1']:['sms1','sms2'];}
function altSeqs(kind){
  const [p,s]=smsOrder(), seq=n=>[`alert>${n}`,`${n}>handset`], wa=['alert>wap','wap>handset'], ml=['alert>mail','mail>handset'];
  return kind==='sms'?[seq(p),seq(s),wa,ml]:[wa,seq(p),seq(s),ml];
}
function seqScore(seq,soft){let r=0;seq.forEach(id=>{const e=EM[id];r=Math.max(r,RANK[nodeStatus(e.a,soft)],RANK[nodeStatus(e.b,soft)]);});return r;}
function smsShare(){ // how alert traffic is split across delivery providers right now
  const [p,s]=smsOrder(), sp=RANK[nodeStatus(p)], ss=RANK[nodeStatus(s)], wa=RANK[nodeStatus('wap')];
  let waS=.34*(wa===0?1:wa===1?.25:0), smsS=.61+(.34-waS), mail=.05, pS,sS;
  if(sp===0&&ss<2){pS=.92;sS=.08;} else if(sp===1&&ss===0){pS=.3;sS=.7;} else if(sp===2&&ss<2){pS=0;sS=1;}
  else if(sp===1&&ss>=1){pS=.7;sS=.3;} else if(sp===0){pS=1;sS=0;} else {pS=0;sS=0;}
  const out={sms1:0,sms2:0,wap:waS,mail:mail}; out[p]=smsS*pS; out[s]=smsS*sS; out.queued=(pS+sS===0)?smsS:0; return out;
}
function pathEval(p){
  const chosen=[];let failover=null;
  p.steps.forEach(s=>{
    if(typeof s==='string'){chosen.push(s);return;}
    const alts=altSeqs(s.alt),sc=alts.map(a=>seqScore(a,p.soft));let best=0;sc.forEach((v,i)=>{if(v<sc[best])best=i;});
    chosen.push(...alts[best]);
    if(best!==0&&sc[0]>0)failover=NM[alts[best][0].split('>')[1]].name;
    else if(best===0&&s.alt==='notify'&&false)failover=null;
  });
  const nodes=[...new Set(chosen.flatMap(id=>[EM[id].a,EM[id].b]))];
  let worst=0;nodes.forEach(n=>{worst=Math.max(worst,RANK[nodeStatus(n,p.soft)]);});
  let lat=0,ok=true;
  const steps=chosen.map((id,i)=>{const e=EM[id],st=RNAME[Math.max(RANK[nodeStatus(e.a,p.soft)],RANK[nodeStatus(e.b,p.soft)])];
    const f=st==='ok'?1:st==='warn'?2.4:Infinity,l=e.lat*f;if(l===Infinity)ok=false;else lat+=l;return {n:i+1,id,e,st,lat:l===Infinity?null:l};});
  let reach=98.6;nodes.forEach(n=>{const r=nodeStatus(n,p.soft);if(r==='warn')reach*=.955;if(r==='down')reach=0;});if(failover)reach*=.985;
  return {p,edges:chosen,nodes,steps,status:RNAME[worst],lat:ok?lat:null,failover,reach:Math.round(reach*10)/10};
}

/* ---------------- geometry ---------------- */
function layout(){
  const ends={};const add=(id,side,other,eid,role)=>{const k=id+side;(ends[k]=ends[k]||[]).push({other,eid,role});};
  EDGES.forEach(e=>{const A=NM[e.a],B=NM[e.b];let sa,sb;
    if(B.col>A.col){sa='R';sb='L';}else if(B.col<A.col){sa='L';sb='R';}else{const down=B.y>A.y;sa=down?'B':'T';sb=down?'T':'B';}
    e.sa=sa;e.sb=sb;add(e.a,sa,B,e.id,'out');add(e.b,sb,A,e.id,'in');});
  const pos={};
  Object.entries(ends).forEach(([k,list])=>{const side=k.slice(-1),id=k.slice(0,-1),n=NM[id];
    list.sort((x,y)=>(x.other.y+x.other.h/2)-(y.other.y+y.other.h/2)||x.other.col-y.other.col);
    list.forEach((it,i)=>{const f=(i+1)/(list.length+1);let x,y;
      if(side==='L'){x=n.x;y=n.y+n.h*f;}else if(side==='R'){x=n.x+FL.NW;y=n.y+n.h*f;}else if(side==='T'){x=n.x+FL.NW*f;y=n.y;}else{x=n.x+FL.NW*f;y=n.y+n.h;}
      pos[it.eid+it.role]={x,y};});});
  EDGES.forEach(e=>{const s=pos[e.id+'out'],t=pos[e.id+'in'];let d;
    if(e.sa==='R'||e.sa==='L'){const dx=Math.max(34,Math.abs(t.x-s.x)*.5)*(e.sa==='R'?1:-1);d=`M${s.x},${s.y} C${s.x+dx},${s.y} ${t.x-dx},${t.y} ${t.x},${t.y}`;}
    else{const dy=Math.max(24,Math.abs(t.y-s.y)*.5)*(e.sa==='B'?1:-1);d=`M${s.x},${s.y} C${s.x},${s.y+dy} ${t.x},${t.y-dy} ${t.x},${t.y}`;}
    e.d=d;e.s=s;e.t=t;e.mid={x:(s.x+t.x)/2,y:(s.y+t.y)/2};});
}
layout();

/* ---------------- svg build ---------------- */
function svgHtml(){
  const bands=LANES.map((l,i)=>`<rect x="${FL.COLX[i]-14}" y="8" width="${FL.NW+28}" height="${FL.H-16}" rx="14" fill="${i%2?'#f8f9fb':'#f3f5f8'}"/><text x="${FL.COLX[i]+FL.NW/2}" y="26" text-anchor="middle" class="fl-lane">${l.toUpperCase()}</text>`).join('');
  const edges=EDGES.map(e=>`<path id="ep-${cssId(e.id)}" class="fl-edge" data-e="${e.id}" d="${e.d}"/>`).join('');
  const hl=EDGES.map(e=>`<path id="hl-${cssId(e.id)}" class="fl-hl" d="${e.d}"/>`).join('');
  const nodes=NODES.map(n=>`<g class="fl-node" data-n="${n.id}" transform="translate(${n.x},${n.y})"><rect class="box" width="${FL.NW}" height="${n.h}" rx="10"/><rect class="acc" x="0" y="0" width="4" height="${n.h}" rx="2" fill="${KCOL[n.kind]}"/>
    <text class="nm" x="14" y="21">${esc(n.name)}</text><text class="sb" id="ns-${n.id}" x="14" y="36">${esc(n.sub)}</text><text class="mt" id="nm-${n.id}" x="14" y="${n.h>60?50:49}"></text>
    <circle class="sd" id="nd-${n.id}" cx="${FL.NW-12}" cy="13" r="5"/><g id="nt-${n.id}"></g></g>`).join('');
  return `<svg id="fl-svg" viewBox="0 0 ${FL.W} ${FL.H}" width="100%"><defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   ${bands}<g id="fl-edges">${edges}</g><g id="fl-hls">${hl}</g><g id="fl-parts"></g><g id="fl-badges"></g><g id="fl-nodes">${nodes}</g></svg>`;
}
const cssId=s=>s.replace('>','_');

const CSS=`<style id="fl-css">
.fl-lane{font:650 10px Inter,system-ui,sans-serif;letter-spacing:.1em;fill:#94a3b8}
.fl-edge{fill:none;stroke:#d3d9e1;stroke-width:1.6;transition:stroke .4s,opacity .3s}
.fl-edge.st-warn{stroke:#f0cf80}.fl-edge.st-down{stroke:#f1aaa3;stroke-dasharray:5 4}
.fl-edge.idle{stroke-dasharray:3 5;opacity:.55}
.fl-hl{fill:none;stroke-width:5;stroke-linecap:round;opacity:0;transition:opacity .25s;pointer-events:none}
.fl-hl.on{opacity:.28;stroke-dasharray:10 8;animation:fldash 1s linear infinite}
@keyframes fldash{to{stroke-dashoffset:-18}}
.fl-node{cursor:pointer;transition:opacity .3s}
.fl-node .box{fill:#fff;stroke:#dfe3ea;stroke-width:1.4;transition:stroke .3s,fill .3s;filter:drop-shadow(0 1px 1.5px rgba(16,24,40,.07))}
.fl-node:hover .box{stroke:#9aa5b4}
.fl-node.st-warn .box{stroke:#e0a100;fill:#fffaf0}.fl-node.st-down .box{stroke:#d92d20;fill:#fff5f4;stroke-width:1.8}
.fl-node.sel .box{stroke:#0f172a;stroke-width:2}
.fl-node .nm{font:650 12px Inter,system-ui,sans-serif;fill:#0f172a}.fl-node .sb{font:500 10px Inter,system-ui,sans-serif;fill:#64748b}
.fl-node .mt{font:600 9.5px ui-monospace,Menlo,monospace;fill:#475569}
.fl-node .sd{fill:#22a45d}.fl-node.st-warn .sd{fill:#e0a100}.fl-node.st-down .sd{fill:#d92d20;animation:flpulse 1.4s infinite}
@keyframes flpulse{0%,100%{opacity:1}50%{opacity:.25}}
.fl-tag{font:700 8.5px Inter,system-ui,sans-serif;letter-spacing:.04em}
.dim .fl-node:not(.on){opacity:.28}.dim .fl-edge:not(.on){opacity:.12}
.fl-badge circle{fill:#0f172a}.fl-badge text{font:700 10px Inter,sans-serif;fill:#fff}
.fl-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.fl-status{display:inline-flex;align-items:center;gap:8px;font-weight:650;padding:6px 12px;border-radius:99px;border:1px solid}
.fl-status.ok{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-line)}.fl-status.warn{background:var(--warn-bg);color:var(--warn);border-color:var(--warn-line)}.fl-status.bad{background:var(--bad-bg);color:var(--bad);border-color:var(--bad-line)}
.fl-chips{display:flex;gap:6px;flex-wrap:wrap}
.fl-chips button{padding:6px 12px;border-radius:99px;border:1px solid var(--line);background:var(--surface);font-weight:600;font-size:12.5px;color:var(--ink-2);display:inline-flex;gap:7px;align-items:center}
.fl-chips button:hover{border-color:#c3cad4}.fl-chips button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.fl-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;margin-bottom:14px}
@media(max-width:1000px){.fl-grid{grid-template-columns:1fr}}
.fl-sum{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:6px 4px 10px;border-bottom:1px solid var(--line-2);margin-bottom:6px;font-size:13px;min-height:38px}
.fl-sum b{font-weight:650}.fl-sum .m{color:var(--muted)}
.fl-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted);padding:2px 4px 0}
.fl-legend span{display:inline-flex;align-items:center;gap:6px}
.fl-step{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line-2);font-size:12.5px}
.fl-step:last-child{border:0}.fl-step .n{width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:10.5px;font-weight:700;flex-shrink:0;margin-top:1px}
.fl-step .l{flex:1}.fl-step small{display:block;color:var(--muted)}
.fl-log{font-size:12.5px;max-height:230px;overflow:auto}.fl-log div{display:flex;gap:9px;padding:5px 0;border-bottom:1px solid var(--line-2)}
.fl-log time{color:var(--faint);font:500 11px ui-monospace,Menlo,monospace;flex-shrink:0;width:52px;padding-top:1px}
.fl-inc{border:1px solid var(--line);border-radius:10px;padding:11px 12px;margin-bottom:10px}
.fl-inc.crit{border-color:var(--bad-line);background:var(--bad-bg)}.fl-inc.warn{border-color:var(--warn-line);background:var(--warn-bg)}
.fl-inc b{font-weight:650}.fl-inc p{font-size:12.5px;margin-top:4px;color:var(--ink-2)}
.fl-inc .fx{color:var(--ok);font-weight:550}
@media(prefers-reduced-motion:reduce){.fl-hl.on{animation:none}.fl-node .sd{animation:none!important}}
</style>`;
if(!document.getElementById('fl-css')) document.head.insertAdjacentHTML('beforeend',CSS);

/* ---------------- page ---------------- */
PAGES.flow=()=>{
  const pe=PATHS.map(pathEval);
  return `<div class="head"><div><h1>Service map</h1><div class="sub">Every service, gateway and provider \u2014 from the parent\u2019s phone to the school\u2019s bank \u00b7 live</div></div><div class="sp"></div>
    <span class="fl-status" id="fl-overall"></span></div>
  <div class="kpis" id="fl-kpis"></div>
  <div class="fl-top">
    <div class="fl-chips" id="fl-chips"></div><div style="flex:1"></div>
    <select class="in" id="fl-inj" style="width:260px"></select><button class="btn" data-fa="inject">Inject incident</button>
    <button class="btn line" data-fa="resolveAll">Resolve all</button><button class="btn line" data-fa="pause" id="fl-pause">Pause</button></div>
  <div class="card" style="padding:10px 14px 10px"><div id="fl-sum"></div><div id="fl-wrap">${svgHtml()}</div>
     <div class="fl-legend"><span><i class="dot ok"></i>Healthy</span><span><i class="dot warn"></i>Degraded</span><span><i class="dot bad"></i>Down</span>
      <span><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#0f172a" stroke-width="3" stroke-dasharray="6 4"/></svg>Selected critical path</span>
      <span><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#f1aaa3" stroke-width="2" stroke-dasharray="5 4"/></svg>Failing link</span><span>Moving dots = live requests \u00b7 click any node or path to inspect</span></div></div>
  <div class="fl-grid"><div class="card" id="fl-detail"></div><div class="card" id="fl-incidents"></div></div>
  <div class="card flush"><h3>Critical paths <span class="note" style="font-weight:500">\u00b7 end to end, including the last mile</span></h3><div id="fl-paths" style="margin-top:10px"></div></div>`;
};

/* ---------------- start / stop / loop ---------------- */
let raf=0,iv=0,last=0;
window.flowStop=function(){cancelAnimationFrame(raf);clearInterval(iv);raf=0;iv=0;FS.parts=[];FS.acc={};};
window.flowStart=function(){
  window.flowStop();FS.parts=[];FS.acc={};
  if(!FS.hashDone){FS.hashDone=true;const h=location.hash,pm=h.match(/path=(\w+)/),im=h.match(/inject=(\w+)/),nm=h.match(/node=(\w+)/); // deep links for demos & screenshots
    if(im&&FAULTS[im[1]]&&!FS.faults[im[1]])injectFault(im[1]);if(pm)FS.path=pm[1];if(nm&&NM[nm[1]])FS.sel=nm[1];}
  paintChips();paintAll();
  last=performance.now();raf=requestAnimationFrame(tick);iv=setInterval(()=>{FS.t++;paintAll();},1000);
  const svg=$('#fl-svg');
  svg.addEventListener('click',e=>{const n=e.target.closest('[data-n]');FS.sel=n?n.dataset.n:null;if(n)FS.path=null;paintChips();paintAll();});
  $('#fl-chips').onclick=e=>{const b=e.target.closest('[data-fp]');if(!b)return;FS.path=FS.path===b.dataset.fp?null:b.dataset.fp;FS.sel=null;paintChips();paintAll();};
  $('#main').onclick=e=>{const b=e.target.closest('[data-fa],[data-res],[data-trace],[data-injnode]');if(!b)return;
    if(b.dataset.res){resolveFault(b.dataset.res);}
    else if(b.dataset.trace){FS.path=b.dataset.trace;FS.sel=null;paintChips();paintAll();window.scrollTo({top:0,behavior:'smooth'});}
    else if(b.dataset.injnode){injectFault(b.dataset.injnode);}
    else if(b.dataset.fa==='inject'){const v=$('#fl-inj').value;if(v)injectFault(v);}
    else if(b.dataset.fa==='resolveAll'){activeIds().forEach(id=>resolveFault(id,true));addLog('ok','All incidents resolved manually');paintAll();syncSide();}
    else if(b.dataset.fa==='pause'){FS.paused=!FS.paused;b.textContent=FS.paused?'Resume':'Pause';}};
};
function syncSide(){window.flowSync();if(window.renderSide)renderSide();}
function injectFault(id){
  if(FS.faults[id])return toast('That incident is already active');
  const f=FAULTS[id];FS.faults[id]={id,since:Date.now(),cur:f.eff};
  addLog('open','Incident opened: '+f.title);
  FS.timers.push(setTimeout(()=>{if(FS.faults[id]){addLog('mit','Auto-mitigation: '+f.fix);paintAll();}},1500));
  if(f.auto){FS.timers.push(setTimeout(()=>{if(FS.faults[id]){FS.faults[id].cur={pg:'warn',api:'warn'};addLog('info','Replica promoted; primary catching up');paintAll();}},7000));
    FS.timers.push(setTimeout(()=>{if(FS.faults[id])resolveFault(id);},15000));}
  syncSide();paintAll();
}
function resolveFault(id,silent){
  if(!FS.faults[id])return;delete FS.faults[id];if(!silent)addLog('ok','Recovered: '+FAULTS[id].title);
  syncSide();if(!silent)paintAll();
}

/* ---------------- animation ---------------- */
function edgeIntensity(e){
  const sa=nodeStatus(e.a),sb=nodeStatus(e.b);let f=e.w;const sh=smsShare();
  if(e.a==='alert'&&sh[e.b]!==undefined)f=sh[e.b]*1.7;
  else if(e.b==='handset'&&sh[e.a]!==undefined)f=sh[e.a]*1.7*(nodeStatus(e.a)==='down'?0:1);
  if(sa==='down')f=0; if(e.a==='sms1'||e.a==='sms2'){} 
  if(FS.path){const pe=pathEval(PATHS.find(p=>p.id===FS.path));f=pe.edges.includes(e.id)?Math.max(f,.75):f*.12;}
  return f;
}
function tick(now){
  raf=requestAnimationFrame(tick);
  const dt=Math.min(.05,(now-last)/1000);last=now;if(FS.paused||REDUCE.matches)return;
  const g=$('#fl-parts');if(!g)return;
  EDGES.forEach(e=>{
    const f=edgeIntensity(e),st=edgeStatus(e);if(f<=0.01)return;
    const rate=f*1.35*(st==='warn'?.6:1);FS.acc[e.id]=(FS.acc[e.id]||0)+rate*dt;
    while(FS.acc[e.id]>=1){FS.acc[e.id]-=1;spawn(e,st,g);}
  });
  for(let i=FS.parts.length-1;i>=0;i--){
    const p=FS.parts[i];p.t+=dt*p.v/p.len;
    if(p.t>=p.die){p.el.remove();FS.parts.splice(i,1);continue;}
    const pt=p.path.getPointAtLength(p.t*p.len);p.el.setAttribute('cx',pt.x);p.el.setAttribute('cy',pt.y);
    if(p.fail&&p.t>p.die-.15)p.el.setAttribute('opacity',Math.max(0,(p.die-p.t)/.15));
  }
}
function spawn(e,st,g){
  if(FS.parts.length>260)return;
  const path=document.getElementById('ep-'+cssId(e.id));if(!path)return;
  const len=path.getTotalLength(),fail=(nodeStatus(e.b)==='down'&&nodeStatus(e.a)!=='down');
  if(fail&&Math.random()>.45)return;
  const el=document.createElementNS('http://www.w3.org/2000/svg','circle');
  el.setAttribute('r',st==='down'?3.2:2.8);el.setAttribute('fill',fail?SCOL.down:SCOL[st]);el.setAttribute('filter','url(#glow)');
  g.appendChild(el);
  FS.parts.push({el,path,len,t:0,v:(st==='warn'?85:150)*(.8+Math.random()*.4),die:fail?.55+Math.random()*.25:1,fail});
}

/* ---------------- painting ---------------- */
function paintChips(){
  const c=$('#fl-chips');if(!c)return;
  c.innerHTML=`<button class="${FS.path?'':'on'}" data-fp="">All traffic</button>`+PATHS.map(p=>{const s=pathEval(p).status;return `<button class="${FS.path===p.id?'on':''}" data-fp="${p.id}"><i class="dot ${s==='ok'?'ok':s==='warn'?'warn':'bad'}"></i>${p.name}</button>`;}).join('');
  c.querySelector('[data-fp=""]').onclick=()=>{FS.path=null;FS.sel=null;paintChips();paintAll();};
}
function jitter(v,p=.05){return v*(1+(Math.random()-.5)*2*p);}
function nodeMetrics(n){
  const st=nodeStatus(n.id),b=n.base,sh=smsShare();let rps=b.rps,lat=b.lat,err=.2+Math.random()*.3;
  if(n.id==='sms1'||n.id==='sms2')rps=Math.max(0,sh[n.id]*14.5);
  if(n.id==='wap')rps=sh.wap*14.5; if(n.id==='mail')rps=sh.mail*14.5;
  if(st==='warn'){if(lat)lat*=2.4;err=2.5+Math.random()*3.5;rps*=.85;}
  if(st==='down'){rps=0;err=100;}
  if(n.id==='agg'&&st==='down'){rps=0;} if(n.id==='momo'||n.id==='bank'){const a=nodeStatus('agg');if(a==='down')rps=0;else if(a==='warn')rps*=.6;}
  if(n.id==='ussd_user'&&(nodeStatus('mno')==='down'))rps=0;
  if(n.id==='pay'&&nodeStatus('agg')==='down')rps*=.1;
  return {st,rps:jitter(rps,.06),lat:lat?jitter(lat,.06):null,err};
}
function paintAll(){
  if(!$('#fl-svg'))return;
  const pe=FS.path?pathEval(PATHS.find(p=>p.id===FS.path)):null, onN=pe?new Set(pe.nodes):null, onE=pe?new Set(pe.edges):null;
  const svg=$('#fl-svg');svg.classList.toggle('dim',!!pe);
  const sh=smsShare(), [pp,ps]=smsOrder();
  let anyDown=false,anyWarn=false;
  NODES.forEach(n=>{const m=nodeMetrics(n);FS.m[n.id]=m;if(m.st==='down')anyDown=true;if(m.st==='warn')anyWarn=true;
    const g=svg.querySelector(`[data-n="${n.id}"]`);g.setAttribute('class',`fl-node st-${m.st}${FS.sel===n.id?' sel':''}${onN&&onN.has(n.id)?' on':''}`);
    const sub=n.id==='sms1'?(pp==='sms1'?'Primary route':'Standby route'):n.id==='sms2'?(pp==='sms2'?'Primary route':'Standby route'):n.sub;
    $('#ns-'+n.id).textContent=sub;
    $('#nm-'+n.id).textContent=m.st==='down'?'DOWN':(m.lat?`${m.rps>=10?Math.round(m.rps):m.rps.toFixed(1)}/s \u00b7 ${Math.round(m.lat)} ms`:`${m.rps>=10?Math.round(m.rps):m.rps.toFixed(1)}/s`);
    let tag='';
    if((n.id==='sms1'||n.id==='sms2')&&m.st==='ok'&&sh[n.id]>.55&&nodeStatus(n.id==='sms1'?'sms2':'sms1')!=='ok'||(n.id===ps&&sh[ps]>.55&&nodeStatus(pp)!=='ok'))
      tag=`<rect x="${FL.NW-62}" y="${n.h-17}" width="56" height="13" rx="6.5" fill="#dbeafe"/><text class="fl-tag" x="${FL.NW-34}" y="${n.h-7.5}" text-anchor="middle" fill="#1d4ed8">FAILOVER</text>`;
    if(n.id==='wap'&&m.st==='warn')tag=`<rect x="${FL.NW-62}" y="${n.h-17}" width="56" height="13" rx="6.5" fill="#fef3c7"/><text class="fl-tag" x="${FL.NW-34}" y="${n.h-7.5}" text-anchor="middle" fill="#92400e">THROTTLED</text>`;
    if(n.id==='alert'&&sh.queued>0)tag=`<rect x="${FL.NW-70}" y="${n.h-17}" width="64" height="13" rx="6.5" fill="#fee2e2"/><text class="fl-tag" x="${FL.NW-38}" y="${n.h-7.5}" text-anchor="middle" fill="#b42318">QUEUE ${Math.round(FS.queue)}</text>`;
    $('#nt-'+n.id).innerHTML=tag;
  });
  if(sh.queued>0)FS.queue+=sh.queued*14;else FS.queue=Math.max(0,FS.queue-40);
  EDGES.forEach(e=>{const el=document.getElementById('ep-'+cssId(e.id)),st=edgeStatus(e),f=edgeIntensity(e);
    el.setAttribute('class',`fl-edge st-${st}${f<=.01?' idle':''}${onE&&onE.has(e.id)?' on':''}`);
    const h=document.getElementById('hl-'+cssId(e.id));const on=onE&&onE.has(e.id);h.setAttribute('class','fl-hl'+(on?' on':''));
    if(on)h.setAttribute('stroke',pe.status==='ok'?'#0f172a':SCOL[pe.status]);});
  $('#fl-badges').innerHTML=pe?pe.steps.map(s=>`<g class="fl-badge" transform="translate(${s.e.mid.x},${s.e.mid.y})"><circle r="8.5"/><text text-anchor="middle" dy="3.5">${s.n}</text></g>`).join(''):'';
  const o=$('#fl-overall');const cls=anyDown?'bad':anyWarn?'warn':'ok';o.className='fl-status '+cls;
  o.innerHTML=`<i class="dot ${cls==='bad'?'bad pulse':cls}"></i>${anyDown?'Partial outage':anyWarn?'Degraded performance':'All systems operational'}`;
  paintKpis();paintDetail(pe);paintIncidents();paintPaths();paintChipsDots();
}
function paintChipsDots(){PATHS.forEach(p=>{const b=document.querySelector(`[data-fp="${p.id}"] .dot`);if(b)b.className='dot '+({ok:'ok',warn:'warn',down:'bad'})[pathEval(p).status];});}
function paintKpis(){
  const M=FS.m,agg=nodeStatus('agg'),ussd=Math.min(...['mno','ussdsvc','redis'].map(i=>3-RANK[nodeStatus(i)]*1.5))/3;
  const pay=Math.round(jitter(34,.05)*(agg==='down'?0:agg==='warn'?.55:1)*(nodeStatus('pay')==='warn'?.85:1));
  const us=Math.round(jitter(142,.06)*Math.max(0,ussd)), al=Math.round(jitter(120,.05)*(nodeStatus('alert')==='warn'?.8:1)), q=Math.round(FS.queue);
  const p95=Math.round((M.api?M.api.lat:180)), whl=agg==='down'?null:agg==='warn'?'8 min':'1.2 s';
  const pes=['ussd','web','results'].map(id=>pathEval(PATHS.find(p=>p.id===id)).reach), lm=Math.round(pes.reduce((a,b)=>a+b,0)/pes.length*10)/10;
  const k=(l,v,s,cl)=>`<div class="kpi"><span>${l}</span><b${cl?` style="color:var(--${cl})"`:''}>${v}</b><small>${s}</small></div>`;
  $('#fl-kpis').innerHTML=k('Payments / min',pay,agg==='ok'?'Aggregator healthy':agg==='warn'?'Aggregator slow':'Aggregator down',agg==='down'?'bad':agg==='warn'?'warn':'')+
    k('Active USSD sessions',us,ussd>=.99?'Gateway healthy':'Impaired',ussd<.5?'bad':ussd<.99?'warn':'')+
    k('Alerts / min',al,q>0?`Queue depth ${q}`:'No backlog',q>0?'bad':'')+
    k('API p95',p95+' ms',p95>400?'Above 300 ms target':'Within target',p95>400?'warn':'')+
    k('Webhook lag',whl||'\u2014',agg==='ok'?'Normal':agg==='warn'?'Reconciliation will heal':'Provider unreachable',agg!=='ok'?'warn':'')+
    k('Last-mile delivery',lm+'%','Receipts reaching handsets',lm<90?'bad':lm<97?'warn':'');
}
const stChip=s=>`<span class="chip ${s==='ok'?'ok':s==='warn'?'warn':'bad'}">${s==='ok'?'Healthy':s==='warn'?'Degraded':'Down'}</span>`;
function paintSummary(pe){
  const el=$('#fl-sum');if(!el)return;el.className='fl-sum';
  if(pe){const p=pe.p;el.innerHTML=`<b>${p.name}</b>${stChip(pe.status)}${pe.failover?'<span class="chip blue">Failover \u2192 '+pe.failover+'</span>':''}<span class="m">End to end</span><b>${pe.lat==null?'\u2014':p.slo===null?'T+1':(pe.lat/1000).toFixed(1)+' s'}</b><span class="m">Last-mile reach</span><b>${p.slo===null?'100%':pe.reach+'%'}</b><span class="m">${pe.steps.length} hops \u00b7 numbered on the map</span>`;return;}
  if(FS.sel){const n=NM[FS.sel],m=FS.m[n.id];el.innerHTML=`<b>${n.name}</b>${stChip(m.st)}<span class="m">Throughput</span><b>${m.rps>=10?Math.round(m.rps):m.rps.toFixed(1)}/s</b><span class="m">p95</span><b>${m.lat?Math.round(m.lat)+' ms':'\u2014'}</b><span class="m">Errors</span><b>${m.err>=99?'100%':m.err.toFixed(1)+'%'}</b>`;return;}
  el.innerHTML=`<span class="m">Pick a critical path above to trace it, or click any node.</span>`;
}
function paintDetail(pe){
  paintSummary(pe);
  const el=$('#fl-detail');
  if(pe){
    const p=pe.p, slo=p.slo;
    el.innerHTML=`<h3>${p.name} ${stChip(pe.status)}</h3><div class="note" style="margin:-4px 0 10px">${p.desc}</div>
     ${pe.failover?`<div class="banner info" style="margin-bottom:10px"><div><b>Auto-failover active:</b> delivering via ${pe.failover}</div></div>`:''}
     ${pe.status==='down'?`<div class="banner bad" style="margin-bottom:10px"><div><b>Impact:</b> ${p.impact}</div></div>`:''}
     <div style="display:flex;gap:18px;margin-bottom:6px"><div><div class="eyebrow">End to end</div><b style="font-size:19px">${pe.lat==null?'\u2014':slo===null?'T+1':(pe.lat/1000).toFixed(1)+' s'}</b>${slo?`<div class="note">budget ${slo/1000} s</div>`:'<div class="note">next business day</div>'}</div>
      <div><div class="eyebrow">Reaches last mile</div><b style="font-size:19px">${slo===null?'100%':pe.reach+'%'}</b><div class="note">${p.id==='settle'?'school account':'parent handset'}</div></div></div>
     <div class="eyebrow" style="margin-top:12px">Hop by hop</div>
     ${pe.steps.map(s=>`<div class="fl-step"><span class="n">${s.n}</span><div class="l"><b>${NM[s.e.a].name}</b> \u2192 <b>${NM[s.e.b].name}</b><small>${s.e.what}${s.lat==null?' \u00b7 failing':s.e.lat?` \u00b7 ${s.lat>=1000?(s.lat/1000).toFixed(1)+' s':Math.round(s.lat)+' ms'}`:' \u00b7 T+1'}</small></div><i class="dot ${s.st==='ok'?'ok':s.st==='warn'?'warn':'bad'}" style="margin-top:6px"></i></div>`).join('')}`;
    return;
  }
  if(FS.sel){
    const n=NM[FS.sel],m=FS.m[n.id]||nodeMetrics(n),fs=activeIds().filter(id=>FAULTS[id].eff[n.id]);
    const ins=EDGES.filter(e=>e.b===n.id).map(e=>NM[e.a].name),outs=EDGES.filter(e=>e.a===n.id).map(e=>NM[e.b].name);
    const nf=(NODE_FAULTS[n.id]||[]).filter(id=>!FS.faults[id]);
    el.innerHTML=`<h3>${n.name} ${stChip(m.st)}</h3><div class="note" style="margin:-4px 0 10px">${n.about}</div>
     <div class="kv"><span>Throughput</span><b>${m.rps>=10?Math.round(m.rps):m.rps.toFixed(1)} / s</b></div><div class="kv"><span>p95 latency</span><b>${m.lat?Math.round(m.lat)+' ms':'\u2014'}</b></div><div class="kv"><span>Error rate</span><b style="color:${m.err>2?'var(--bad)':'inherit'}">${m.err>=99?'100%':m.err.toFixed(1)+'%'}</b></div>
     <div class="kv"><span>Receives from</span><b style="text-align:right;font-weight:550">${ins.join(', ')||'\u2014'}</b></div><div class="kv"><span>Sends to</span><b style="text-align:right;font-weight:550">${outs.join(', ')||'\u2014'}</b></div>
     ${fs.map(id=>`<div class="fl-inc ${FAULTS[id].sev}" style="margin-top:12px"><b>${FAULTS[id].title}</b><p>${FAULTS[id].impact}</p></div>`).join('')}
     ${nf.length?`<div class="eyebrow" style="margin-top:14px">Simulate on this node</div><div style="display:flex;gap:6px;flex-wrap:wrap">${nf.map(id=>`<button class="btn sm line" data-injnode="${id}">${FAULTS[id].title}</button>`).join('')}</div>`:''}`;
    return;
  }
  el.innerHTML=`<h3>Inspect</h3><div class="note">Select a <b>critical path</b> above to trace a request hop by hop, with latency and last-mile reach, or click any <b>node</b> for its metrics and dependencies. Use <b>Inject incident</b> to see how failures propagate and how the platform fails over.</div>`;
}
function paintIncidents(){
  const ids=activeIds(),el=$('#fl-incidents');
  const sel=$('#fl-inj');if(sel&&!sel.dataset.set||sel&&sel.dataset.n!==ids.join()){sel.dataset.set=1;sel.dataset.n=ids.join();
    sel.innerHTML='<option value="">Choose an incident to simulate\u2026</option>'+Object.entries(FAULTS).filter(([id])=>!FS.faults[id]).map(([id,f])=>`<option value="${id}">${f.sev==='crit'?'\u25cf Critical \u00b7 ':'\u25cb Degraded \u00b7 '}${f.title}</option>`).join('');}
  const ago2=ts=>{const s=Math.round((Date.now()-ts)/1000);return s<60?s+'s ago':Math.round(s/60)+'m ago';};
  el.innerHTML=`<h3>Incidents <span class="sp"></span><span class="chip ${ids.length?'warn':'ok'}">${ids.length} active</span></h3>
   ${ids.length?ids.map(id=>{const f=FAULTS[id];return `<div class="fl-inc ${f.sev}"><div style="display:flex;gap:8px;align-items:center"><b style="flex:1">${f.title}</b><button class="btn sm line" data-res="${id}">Resolve</button></div><p>${f.impact}</p><p class="fx">${f.fix}</p><p class="note">Opened ${ago2(FS.faults[id].since)}</p></div>`;}).join(''):'<div class="note" style="padding:4px 0 10px">No active incidents. Everything is flowing.</div>'}
   <div class="eyebrow" style="margin:14px 0 6px">Event log</div><div class="fl-log">${FS.log.slice(0,10).map(l=>`<div><time>${new Date(l.ts).toTimeString().slice(0,8)}</time><span><i class="dot ${l.kind==='open'?'bad':l.kind==='ok'?'ok':l.kind==='mit'?'warn':''}" style="margin-right:6px"></i>${l.text}</span></div>`).join('')}</div>`;
}
function paintPaths(){
  const el=$('#fl-paths');if(!el)return;
  el.innerHTML=`<table class="tbl"><thead><tr><th>Path</th><th>Status</th><th class="r">End to end</th><th class="r">Budget</th><th class="r">Last-mile reach</th><th>Protection</th><th></th></tr></thead><tbody>${
   PATHS.map(p=>{const e=pathEval(p);return `<tr><td><b>${p.name}</b><small>${p.desc}</small></td><td>${stChip(e.status)}${e.failover?' <span class="chip blue">Failover</span>':''}</td>
     <td class="r">${e.lat==null?'\u2014':p.slo===null?'T+1':(e.lat/1000).toFixed(1)+' s'}</td><td class="r">${p.slo?p.slo/1000+' s':'T+1'}</td><td class="r">${p.slo===null?'100%':e.reach+'%'}</td>
     <td class="note">${e.status==='down'?p.impact:e.failover?'Rerouted to '+e.failover:e.status==='warn'?'Degraded, within tolerance':'\u2014'}</td><td class="r"><button class="btn sm ghost" data-trace="${p.id}">Trace</button></td></tr>`;}).join('')}</tbody></table>`;
}
})();
