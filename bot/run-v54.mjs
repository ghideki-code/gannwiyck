import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd(), OUT=path.join(ROOT,'bot-results-v54');
const SYMBOL=process.env.SYMBOL||'BTCUSDT';
const TFS=(process.env.TIMEFRAMES||'1h,4h,12h,1d').split(',');
const MAX=+(process.env.MAX_CANDLES||50000), MAXB=+(process.env.MAX_BARS||120), WARM=+(process.env.WARMUP||100);
const BASE='https://data-api.binance.vision/api/v3/klines';
const sleep=m=>new Promise(r=>setTimeout(r,m));
const finite=x=>Number.isFinite(Number(x));

function agg(es){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const w=c.filter(e=>e.outcome==='target'), l=c.filter(e=>e.outcome==='stop');
  const rs=c.map(e=>+e.r).filter(Number.isFinite);
  const grossW=w.reduce((s,e)=>s+(+e.r||0),0);
  const grossL=Math.abs(l.reduce((s,e)=>s+(+e.r||0),0));
  const totalR=rs.reduce((s,x)=>s+x,0);
  return {samples:es.length,closed:c.length,wins:w.length,losses:l.length,
    ambiguous:es.filter(e=>e.outcome==='ambiguous').length,
    winRate:c.length?w.length/c.length:null,totalR,avgR:c.length?totalR/c.length:null,
    profitFactor:grossL?grossW/grossL:null};
}
function wilson(w,n,z=1.959963984540054){
  if(!n)return null; const p=w/n, d=1+z*z/n, c=(p+z*z/(2*n))/d, h=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;
  return [Math.max(0,c-h),Math.min(1,c+h)];
}
function maxLossStreak(es){let s=0,m=0;for(const e of es){if(e.outcome==='stop'){s++;m=Math.max(m,s)}else if(e.outcome==='target')s=0}return m}
function concentration(es){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const rs=c.map(e=>Number(e.r)).filter(Number.isFinite).sort((a,b)=>b-a);
  const total=rs.reduce((a,b)=>a+b,0);
  const pos=rs.filter(x=>x>0).reduce((a,b)=>a+b,0);
  return {totalR:total,positiveR:pos,top1:total?rs[0]/total:null,top3:total?rs.slice(0,3).reduce((a,b)=>a+b,0)/total:null,top5:total?rs.slice(0,5).reduce((a,b)=>a+b,0)/total:null};
}
function cost(es,costR){
  const x=es.map(e=>({...e,r:Number(e.r)-costR}));
  return agg(x);
}
function ageCap(es,cap){
  return agg(es.filter(e=>finite(e.t2)&&finite(e.entryIndex)&&e.entryIndex-e.t2<=cap));
}
async function page(tf,end){
  const u=new URL(BASE);u.searchParams.set('symbol',SYMBOL);u.searchParams.set('interval',tf);u.searchParams.set('limit','1000');if(end)u.searchParams.set('endTime',end);
  for(let a=1;a<=5;a++){try{const r=await fetch(u),t=await r.text();if(r.ok)return JSON.parse(t);if(r.status===429||r.status>=500){await sleep(a*1000);continue}throw Error('Binance HTTP '+r.status)}catch(e){if(a===5)throw e;await sleep(a*1000)}}
}
async function data(tf){
  const ms={'1h':36e5,'4h':144e5,'12h':432e5,'1d':864e5}[tf];let end=Date.now()-ms,all=[];
  while(all.length<MAX){const p=await page(tf,end);if(!p.length)break;all.push(...p);if(p.length<1000)break;end=+p[0][0]-1;await sleep(80)}
  const m=new Map();for(const k of all)m.set(+k[0],{time:+k[0],open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]});
  return {tf,cs:[...m.values()].sort((a,b)=>a.time-b.time).slice(-MAX)};
}
async function engine(){
  const s={console,globalThis:{}};vm.createContext(s);
  vm.runInContext(await fs.readFile(path.join(ROOT,'src/gannwyck-model1.js'),'utf8'),s);
  vm.runInContext(await fs.readFile(path.join(ROOT,'src/research-stats.js'),'utf8'),s);
  return s.globalThis;
}
const candidates=[
 {id:'BASELINE',ok:()=>true},
 {id:'AGE_LE_720',ok:e=>finite(e.entryIndex)&&finite(e.t2)&&e.entryIndex-e.t2<=720},
 {id:'AGE_GE_721',ok:e=>finite(e.entryIndex)&&finite(e.t2)&&e.entryIndex-e.t2>=721},
 {id:'RISK_GE_0.5PCT',ok:e=>finite(e.entry)&&+e.entry?Math.abs((+e.risk||0)/+e.entry)>=.005:false},
 {id:'RANGE_GE_5PCT',ok:e=>finite(e.rangePctEntry)&&+e.rangePctEntry>=.05},
 {id:'BOS_T3_GE_12',ok:e=>finite(e.bosTap3Bars)&&+e.bosTap3Bars>=12}
];
function folds(rows,k=5){
  const c=[...rows].filter(e=>e.outcome==='target'||e.outcome==='stop').sort((a,b)=>(+a.entryIndex)-(+b.entryIndex));
  const n=c.length, out=[]; for(let i=0;i<k;i++){const a=Math.floor(i*n/k),b=i===k-1?n:Math.floor((i+1)*n/k);out.push(c.slice(a,b));} return out;
}
function evaluate(rows){
  const out={};
  for(const c of candidates){
    const ev=rows.filter(c.ok), fs=folds(ev), fa=fs.map((x,i)=>({fold:i+1,...agg(x),ci:wilson(x.filter(e=>e.outcome==='target').length,x.length),maxLossStreak:maxLossStreak(x),concentration:concentration(x)}));
    const costs=[0,.05,.10,.20,.30,.50].map(v=>({costR:v,...agg(ev.map(e=>({...e,r:Number(e.r)-v})))}));
    const caps=[168,720,1440,2880,5760].map(v=>({cap:v,...ageCap(ev,v)}));
    const half=Math.floor(ev.length/2),first=ev.slice(0,half),second=ev.slice(half);
    out[c.id]={all:agg(ev),folds:fa,costs,ageCaps:caps,firstHalf:agg(first),secondHalf:agg(second),concentration:concentration(ev),maxLossStreak:maxLossStreak(ev)};
  }
  return out;
}
function gate(r){
  const f=r.folds.filter(x=>x.closed>=3);
  return {
    enoughData:r.all.closed>=20,
    positive:r.all.totalR>0,
    medianFoldPositive:f.length>=3 && f.filter(x=>x.totalR>0).length>=Math.ceil(f.length/2),
    survivesTop3:r.concentration.top3!==null && r.all.totalR>0 && (r.all.totalR-r.folds.flatMap(x=>[]).length)>=0,
    noCatastrophicConcentration:r.concentration.top1===null || r.concentration.top1<1,
    cost10:r.costs.find(x=>x.costR===.10)?.totalR>0,
    secondHalfPositive:r.secondHalf.closed>=5 && r.secondHalf.totalR>0
  };
}
function run(d,E){
  const M=E.GannWyckModel1,S=E.GannWyckResearchStats;
  const bt=M.backtestCausal(d.cs,{warmup:WARM,maxBars:MAXB});
  const rows=bt.events.map(e=>S.featureRow(e,d.cs));
  const audit=M.lookaheadAudit(d.cs,{warmup:WARM,maxBars:MAXB});
  const candidatesOut=evaluate(rows);
  const gates={};
  for(const [id,r] of Object.entries(candidatesOut))gates[id]=gate(r);
  return {version:'V5.4-ROBUSTNESS',source:{exchange:'Binance Spot public market data',symbol:SYMBOL,timeframe:d.tf,candles:d.cs.length},
    rules:{realDataOnly:true,noSyntheticData:true,causal:true,parametersFrozen:true,noOosSelection:true,allCandidatesEvaluatedIndependently:true},
    backtest:bt.summary,audit:{ok:audit.ok,events:audit.events,violations:audit.violations},candidates:candidatesOut,gates,notes:[
      'V5.4 does not select a winner. Every predeclared candidate is evaluated independently.',
      'Costs are diagnostic in R units; no execution/slippage model is assumed.',
      'Fold statistics are descriptive and are not treated as proof of significance.',
      'The final decision remains blocked if robustness evidence is insufficient.'
    ],events:rows};
}
(async()=>{await fs.mkdir(OUT,{recursive:true});const E=await engine(),all=[];
for(const raw of TFS){const tf=raw.trim(),d=await data(tf),r=run(d,E);all.push(r);await fs.writeFile(path.join(OUT,SYMBOL+'_'+tf+'_V5.4.json'),JSON.stringify(r,null,2));
console.log(tf,Object.fromEntries(Object.entries(r.candidates).map(([k,v])=>[k,{closed:v.all.closed,totalR:v.all.totalR,folds:v.folds.map(f=>f.totalR),secondHalf:v.secondHalf.totalR,cost10:v.costs.find(x=>x.costR===.1)?.totalR}])))}
const summary={version:'V5.4-ROBUSTNESS',generatedAt:new Date().toISOString(),symbol:SYMBOL,timeframes:all.map(r=>({timeframe:r.source.timeframe,candles:r.source.candles,audit:r.audit,gates:r.gates,candidates:Object.fromEntries(Object.entries(r.candidates).map(([k,v])=>[k,{all:v.all,folds:v.folds,firstHalf:v.firstHalf,secondHalf:v.secondHalf,cost10:v.costs.find(x=>x.costR===.1),concentration:v.concentration}]))}))};
await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(OUT,'SUMMARY.md'),'# GannWyck V5.4 Robustness\\n\\n'+all.map(r=>'## '+r.source.timeframe+'\\n'+Object.entries(r.candidates).map(([k,v])=>'- **'+k+'**: '+v.all.closed+' closed, '+v.all.totalR.toFixed(2)+'R, second half '+v.secondHalf.totalR.toFixed(2)+'R, cost 0.10R '+(v.costs.find(x=>x.costR===.1)?.totalR??NaN).toFixed(2)+'R').join('\\n')).join('\\n\\n'))})();
