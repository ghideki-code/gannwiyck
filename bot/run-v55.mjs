import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd(), OUT=path.join(ROOT,'bot-results-v55');
const SYMBOL=process.env.SYMBOL||'BTCUSDT';
const TFS=(process.env.TIMEFRAMES||'1h,4h,12h,1d').split(',');
const MAX=+(process.env.MAX_CANDLES||50000), MAXB=+(process.env.MAX_BARS||120), WARM=+(process.env.WARMUP||100);
const BOOT=+(process.env.BOOTSTRAPS||5000);
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
  const sorted=[...rs].sort((a,b)=>a-b);
  const median=sorted.length?sorted[Math.floor((sorted.length-1)/2)]:null;
  return {samples:es.length,closed:c.length,wins:w.length,losses:l.length,
    ambiguous:es.filter(e=>e.outcome==='ambiguous').length,
    winRate:c.length?w.length/c.length:null,totalR,avgR:c.length?totalR/c.length:null,
    medianR:median,profitFactor:grossL?grossW/grossL:null};
}
function wilson(w,n,z=1.959963984540054){
  if(!n)return null; const p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;
  return [Math.max(0,c-h),Math.min(1,c+h)];
}
function maxLossStreak(es){let s=0,m=0;for(const e of es){if(e.outcome==='stop'){s++;m=Math.max(m,s)}else if(e.outcome==='target')s=0}return m}
function drawdown(es){
  let eq=0,peak=0,maxDD=0,peakAt=0,troughAt=0,peakBeforeTrough=0,recoveryBars=null;
  for(let i=0;i<es.length;i++){
    eq+=Number(es[i].r)||0;
    if(eq>peak){peak=eq;peakAt=i}
    const dd=peak-eq;
    if(dd>maxDD){maxDD=dd;troughAt=i;peakBeforeTrough=peak}
  }
  if(maxDD>0){
    let e=0;
    for(let i=0;i<es.length;i++){
      e+=Number(es[i].r)||0;
      if(i>troughAt&&e>=peakBeforeTrough){recoveryBars=i-troughAt;break}
    }
  }
  return {maxDrawdownR:maxDD,peakR:peak,finalR:eq,peakIndex:peakAt,troughIndex:troughAt,recoveryBars};
}
function concentration(es){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const rs=c.map(e=>Number(e.r)).filter(Number.isFinite).sort((a,b)=>b-a);
  const total=rs.reduce((a,b)=>a+b,0);
  const positive=rs.filter(x=>x>0);
  const sumTop=k=>positive.slice(0,k).reduce((a,b)=>a+b,0);
  return {totalR:total,top1R:sumTop(1),top3R:sumTop(3),top5R:sumTop(5),
    top1Share:total?sumTop(1)/total:null,top3Share:total?sumTop(3)/total:null,top5Share:total?sumTop(5)/total:null};
}
function removeTopPositive(es,k){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const ranked=c.map((e,i)=>({e,i,r:Number(e.r)})).filter(x=>x.r>0).sort((a,b)=>b.r-a.r);
  const remove=new Set(ranked.slice(0,k).map(x=>x.i));
  return c.filter((e,i)=>!remove.has(i));
}
function costs(es,costR){return agg(es.map(e=>({...e,r:Number(e.r)-costR})));}
function ageCap(es,cap){return agg(es.filter(e=>finite(e.t2)&&finite(e.entryIndex)&&e.entryIndex-e.t2<=cap));}
function seeded(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function quantile(a,q){if(!a.length)return null;const x=[...a].sort((u,v)=>u-v),p=(x.length-1)*q,b=Math.floor(p),f=p-b;return x[b]+(x[b+1]===undefined?0:f*(x[b+1]-x[b]) )}
function iidBootstrap(rs,n,seed){
  const rnd=seeded(seed), vals=[]; if(!rs.length)return null;
  for(let b=0;b<n;b++){let s=0;for(let i=0;i<rs.length;i++)s+=rs[Math.floor(rnd()*rs.length)];vals.push(s)}
  return {n,mean:vals.reduce((a,b)=>a+b,0)/n,p05:quantile(vals,.05),p50:quantile(vals,.5),p95:quantile(vals,.95),probTotalPositive:vals.filter(x=>x>0).length/n};
}
function blockBootstrap(rs,n,block,seed){
  const rnd=seeded(seed), vals=[]; if(!rs.length)return null;
  const m=Math.max(1,Math.min(block,rs.length));
  for(let b=0;b<n;b++){
    let s=0,drawn=0;
    while(drawn<rs.length){
      const start=Math.floor(rnd()*rs.length);
      const take=Math.min(m,rs.length-drawn);
      for(let j=0;j<take;j++)s+=rs[(start+j)%rs.length];
      drawn+=take;
    }
    vals.push(s);
  }
  return {block:m,n,mean:vals.reduce((a,b)=>a+b,0)/n,p05:quantile(vals,.05),p50:quantile(vals,.5),p95:quantile(vals,.95),probTotalPositive:vals.filter(x=>x>0).length/n};
}
function autocorrESS(rs){
  const n=rs.length;if(n<3)return {n,ess:n,acf1:null};
  const mean=rs.reduce((a,b)=>a+b,0)/n;let den=0,num=0;for(const x of rs)den+=(x-mean)**2;
  for(let i=1;i<n;i++)num+=(rs[i]-mean)*(rs[i-1]-mean);
  const acf1=den?num/den:0;const rho=Math.max(-.99,Math.min(.99,acf1));const ess=Math.max(1,n/(1+2*rho));
  return {n,acf1,ess};
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
 {id:'BASELINE',ok:()=>true},{id:'AGE_LE_720',ok:e=>finite(e.entryIndex)&&finite(e.t2)&&e.entryIndex-e.t2<=720},
 {id:'AGE_GE_721',ok:e=>finite(e.entryIndex)&&finite(e.t2)&&e.entryIndex-e.t2>=721},
 {id:'RISK_GE_0.5PCT',ok:e=>finite(e.entry)&&+e.entry?Math.abs((+e.risk||0)/+e.entry)>=.005:false},
 {id:'RANGE_GE_5PCT',ok:e=>finite(e.rangePctEntry)&&+e.rangePctEntry>=.05},
 {id:'BOS_T3_GE_12',ok:e=>finite(e.bosTap3Bars)&&+e.bosTap3Bars>=12}
];
function folds(rows,k=5){const c=[...rows].filter(e=>e.outcome==='target'||e.outcome==='stop').sort((a,b)=>(+a.entryIndex)-(+b.entryIndex));const n=c.length,out=[];for(let i=0;i<k;i++){const a=Math.floor(i*n/k),b=i===k-1?n:Math.floor((i+1)*n/k);out.push(c.slice(a,b))}return out}
function robustness(ev,seed){
  const closed=ev.filter(e=>e.outcome==='target'||e.outcome==='stop'),rs=closed.map(e=>Number(e.r)).filter(Number.isFinite);
  const fs=folds(ev), half=Math.floor(closed.length/2);
  const boot=blockBootstrap(rs,BOOT,Math.max(2,Math.min(10,Math.floor(rs.length/5)||2)),seed);
  return {
    iidBootstrap:iidBootstrap(rs,BOOT,seed+17),
    blockBootstrap:boot,
    effectiveIndependentEvents:autocorrESS(rs),
    removeTop:[1,2,3,5].map(k=>({k,...agg(removeTopPositive(ev,k))})),
    drawdown:drawdown(closed),
    firstHalf:agg(closed.slice(0,half)),secondHalf:agg(closed.slice(half)),
    bySide:{LONG:agg(closed.filter(e=>e.side==='LONG')),SHORT:agg(closed.filter(e=>e.side==='SHORT'))},
    byTrend:{UP:agg(closed.filter(e=>String(e.trend).toLowerCase()==='up')),DOWN:agg(closed.filter(e=>String(e.trend).toLowerCase()==='down')),RANGE:agg(closed.filter(e=>String(e.trend).toLowerCase()==='range'))},
    maxLossStreak:maxLossStreak(closed),folds:fs.map((x,i)=>({fold:i+1,...agg(x),maxLossStreak:maxLossStreak(x)})),
    costs:[0,.05,.10,.20,.30,.50].map(v=>({costR:v,...costs(ev,v)}))
  };
}
function evaluate(rows,tf){
  const out={};for(const c of candidates){const ev=rows.filter(c.ok);out[c.id]={all:agg(ev),robustness:robustness(ev,fnv1(tf+c.id))}}return out;
}
function fnv1(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function screen(r){
  const rem=r.robustness.removeTop.find(x=>x.k===3), b=r.robustness.blockBootstrap, folds=r.robustness.folds.filter(x=>x.closed>=3);
  return {enoughClosed:r.all.closed>=30,lookForPositiveBase:r.all.totalR>0,positiveAfterTop3:rem?.totalR>0,
    positiveAfterCost10:r.robustness.costs.find(x=>x.costR===.10)?.totalR>0,
    positiveSecondHalf:r.robustness.secondHalf.closed>=10&&r.robustness.secondHalf.totalR>0,
    foldsPositive:folds.filter(x=>x.totalR>0).length,
    foldsCount:folds.length,blockBootstrapP05:b?.p05??null,
    concentrationTop1Share:r.robustness.removeTop[0]?.totalR===null?null:(r.all.totalR-(r.robustness.removeTop[1]?.totalR??r.all.totalR))/(r.all.totalR||1),
    NOTE:'This is a robustness screen, not a trading approval gate. No candidate is selected and no real order is executed.'
  };
}
function run(d,E){
  const M=E.GannWyckModel1,S=E.GannWyckResearchStats,bt=M.backtestCausal(d.cs,{warmup:WARM,maxBars:MAXB});
  const rows=bt.events.map(e=>S.featureRow(e,d.cs)),audit=M.lookaheadAudit(d.cs,{warmup:WARM,maxBars:MAXB}),candidatesOut=evaluate(rows,d.tf);
  const screens=Object.fromEntries(Object.entries(candidatesOut).map(([id,r])=>[id,screen(r)]));
  return {version:'V5.5-ROBUSTNESS',source:{exchange:'Binance Spot public market data',symbol:SYMBOL,timeframe:d.tf,candles:d.cs.length},rules:{realDataOnly:true,noSyntheticData:true,causal:true,parametersFrozen:true,noOosSelection:true},backtest:bt.summary,audit:{ok:audit.ok,events:audit.events,violations:audit.violations},candidates:candidatesOut,screens,notes:['V5.5 corrects the V5.4 top-3 concentration calculation by actually removing the largest positive closed events.','Bootstrap intervals are diagnostic; time-series dependence can make IID bootstrap inappropriate, so moving-block bootstrap is also reported.','No permutation of R values is used for total-R significance because permutation leaves the total unchanged.','Effective independent event count is a heuristic based on lag-1 autocorrelation, not a formal dependence model.','V5.5 never selects a winner and never authorizes live trading.'],events:rows};
}
(async()=>{await fs.mkdir(OUT,{recursive:true});const E=await engine(),all=[];
for(const raw of TFS){const tf=raw.trim(),d=await data(tf),r=run(d,E);all.push(r);await fs.writeFile(path.join(OUT,SYMBOL+'_'+tf+'_V5.5.json'),JSON.stringify(r,null,2));console.log(tf,Object.fromEntries(Object.entries(r.candidates).map(([k,v])=>[k,{closed:v.all.closed,totalR:v.all.totalR,top3:v.robustness.removeTop.find(x=>x.k===3)?.totalR,blockP05:v.robustness.blockBootstrap?.p05??null,secondHalf:v.robustness.secondHalf.totalR}])))}
const summary={version:'V5.5-ROBUSTNESS',generatedAt:new Date().toISOString(),symbol:SYMBOL,timeframes:all.map(r=>({timeframe:r.source.timeframe,candles:r.source.candles,audit:r.audit,screens:r.screens,candidates:Object.fromEntries(Object.entries(r.candidates).map(([k,v])=>[k,{all:v.all,robustness:v.robustness}]))}))};
await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(OUT,'SUMMARY.md'),'# GannWyck V5.5 Robustness\n\n'+all.map(r=>'## '+r.source.timeframe+'\n'+Object.entries(r.candidates).map(([k,v])=>{const z=v.robustness;return '- **'+k+'**: '+v.all.closed+' closed, '+v.all.totalR.toFixed(2)+'R, top3-removal '+(z.removeTop.find(x=>x.k===3)?.totalR??NaN).toFixed(2)+'R, block-bootstrap P05 '+(z.blockBootstrap.p05??NaN).toFixed(2)+'R, second half '+z.secondHalf.totalR.toFixed(2)+'R'}).join('\n')).join('\n\n'))})();
