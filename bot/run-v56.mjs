import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd(), OUT=path.join(ROOT,'bot-results-v56');
const SYMBOL='BTCUSDT';
const TFS=(process.env.TIMEFRAMES||'1h,4h,12h,1d').split(',');
const MAX=+(process.env.MAX_CANDLES||50000), MAXB=+(process.env.MAX_BARS||120), WARM=+(process.env.WARMUP||100);
const BOOT=+(process.env.BOOTSTRAPS||5000);
// Pre-registered freeze point. Data before this timestamp is historical/context only.
// It MUST NOT be used as prospective OOS evidence.
const FREEZE_ISO=process.env.FREEZE_ISO||'2026-09-20T00:15:00Z';
const FREEZE=Date.parse(FREEZE_ISO);
const FROZEN_MODEL_BLOB_SHA='9ef385bbc7e86db24fe1c9bca87c3e6b536df714';
const FROZEN_STATS_BLOB_SHA='16721ac77d21af9a6f19ec8003a707b6f2cd3d92';
const BASE='https://data-api.binance.vision/api/v3/klines';
const sleep=m=>new Promise(r=>setTimeout(r,m));
const finite=x=>Number.isFinite(Number(x));

function agg(es){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const w=c.filter(e=>e.outcome==='target'), l=c.filter(e=>e.outcome==='stop');
  const rs=c.map(e=>Number(e.r)).filter(Number.isFinite);
  const totalR=rs.reduce((a,b)=>a+b,0);
  const grossW=w.reduce((a,e)=>a+(Number(e.r)||0),0);
  const grossL=Math.abs(l.reduce((a,e)=>a+(Number(e.r)||0),0));
  const s=[...rs].sort((a,b)=>a-b);
  return {samples:es.length,closed:c.length,wins:w.length,losses:l.length,
    ambiguous:es.filter(e=>e.outcome==='ambiguous').length,winRate:c.length?w.length/c.length:null,
    totalR,avgR:c.length?totalR/c.length:null,medianR:s.length?s[Math.floor((s.length-1)/2)]:null,
    profitFactor:grossL?grossW/grossL:null};
}
function seeded(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function quantile(a,q){if(!a.length)return null;const x=[...a].sort((u,v)=>u-v),p=(x.length-1)*q,b=Math.floor(p),f=p-b;return x[b]+(x[b+1]===undefined?0:f*(x[b+1]-x[b]))}
function blockBootstrap(rs,n,block,seed){
  if(!rs.length)return null;const rnd=seeded(seed),vals=[],m=Math.max(1,Math.min(block,rs.length));
  for(let b=0;b<n;b++){let s=0,d=0;while(d<rs.length){const start=Math.floor(rnd()*rs.length),take=Math.min(m,rs.length-d);for(let j=0;j<take;j++)s+=rs[(start+j)%rs.length];d+=take}vals.push(s)}
  return {block:m,n,mean:vals.reduce((a,b)=>a+b,0)/n,p05:quantile(vals,.05),p50:quantile(vals,.5),p95:quantile(vals,.95),probTotalPositive:vals.filter(x=>x>0).length/n};
}
function removeTopPositive(es,k){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const ranked=c.map((e,i)=>({i,r:Number(e.r)})).filter(x=>x.r>0).sort((a,b)=>b.r-a.r);
  const rm=new Set(ranked.slice(0,k).map(x=>x.i));return c.filter((e,i)=>!rm.has(i));
}
function maxLossStreak(es){let s=0,m=0;for(const e of es){if(e.outcome==='stop'){s++;m=Math.max(m,s)}else if(e.outcome==='target')s=0}return m}
function drawdown(es){
  let eq=0,peak=0,maxDD=0,trough=-1,peakBefore=0;
  for(let i=0;i<es.length;i++){eq+=Number(es[i].r)||0;if(eq>peak)peak=eq;const dd=peak-eq;if(dd>maxDD){maxDD=dd;trough=i;peakBefore=peak}}
  let recovery=null;if(trough>=0){let e=0;for(let i=0;i<es.length;i++){e+=Number(es[i].r)||0;if(i>trough&&e>=peakBefore){recovery=i-trough;break}}}
  return {maxDrawdownR:maxDD,finalR:eq,recoveryBars:recovery};
}
function folds(es,k=5){
  const c=es.filter(e=>e.outcome==='target'||e.outcome==='stop').sort((a,b)=>Number(a.entryIndex)-Number(b.entryIndex)),out=[];
  for(let i=0;i<k;i++){const a=Math.floor(i*c.length/k),b=i===k-1?c.length:Math.floor((i+1)*c.length/k);out.push(c.slice(a,b))}
  return out;
}
async function page(tf,end){
  const u=new URL(BASE);u.searchParams.set('symbol',SYMBOL);u.searchParams.set('interval',tf);u.searchParams.set('limit','1000');u.searchParams.set('endTime',String(end));
  for(let a=1;a<=5;a++){try{const r=await fetch(u),t=await r.text();if(r.ok)return JSON.parse(t);if(r.status===429||r.status>=500){await sleep(a*1000);continue}throw Error('Binance HTTP '+r.status)}catch(e){if(a===5)throw e;await sleep(a*1000)}}
}
async function data(tf){
  const ms={'1h':36e5,'4h':144e5,'12h':432e5,'1d':864e5}[tf];let end=Date.now()-ms,all=[];
  while(all.length<MAX){const p=await page(tf,end);if(!p.length)break;all.push(...p);if(p.length<1000)break;end=Number(p[0][0])-1;await sleep(80)}
  const m=new Map();for(const k of all)m.set(Number(k[0]),{time:Number(k[0]),open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]});
  return {tf,cs:[...m.values()].sort((a,b)=>a.time-b.time).slice(-MAX)};
}
function verifyFrozenSources(){
  const sha=p=>execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();
  const model=sha('src/gannwyck-model1.js'),stats=sha('src/research-stats.js');
  if(model!==FROZEN_MODEL_BLOB_SHA||stats!==FROZEN_STATS_BLOB_SHA){throw Error('FROZEN_SOURCE_INTEGRITY_FAILED model='+model+' stats='+stats)}
  return {modelBlobSha:model,statsBlobSha:stats};
}
async function engine(){
  const s={console,globalThis:{}};vm.createContext(s);
  vm.runInContext(await fs.readFile(path.join(ROOT,'src/gannwyck-model1.js'),'utf8'),s);
  vm.runInContext(await fs.readFile(path.join(ROOT,'src/research-stats.js'),'utf8'),s);
  return s.globalThis;
}
function run(d,E){
  const M=E.GannWyckModel1,S=E.GannWyckResearchStats;
  const bt=M.backtestCausal(d.cs,{warmup:WARM,maxBars:MAXB});
  const rows=bt.events.map(e=>S.featureRow(e,d.cs));
  const audit=M.lookaheadAudit(d.cs,{warmup:WARM,maxBars:MAXB});
  const prospective=rows.filter(e=>Number(e.time)>FREEZE);
  const closed=prospective.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const rs=closed.map(e=>Number(e.r)).filter(Number.isFinite);
  const rem=removeTopPositive(prospective,3);
  const block=blockBootstrap(rs,BOOT,Math.max(2,Math.min(10,Math.floor(rs.length/5)||2)),fnv1(d.tf));
  const fs=folds(prospective);
  const second=closed.slice(Math.floor(closed.length/2));
  const checks={
    minimumClosed:closed.length>=30,
    positiveTotalR:closed.length>0&&agg(prospective).totalR>0,
    positiveAfterTop3:rem.length>0&&agg(rem).totalR>0,
    blockBootstrapP05Positive:block?.p05!=null&&block.p05>0,
    positiveSecondHalf:second.length>=15&&agg(second).totalR>0,
    atLeast4of5Positive:fs.filter(x=>x.length>=3&&agg(x).totalR>0).length>=4
  };
  const allPass=Object.values(checks).every(Boolean);
  return {version:'V5.6-PROSPECTIVE-HOLDOUT',source:{exchange:'Binance Spot public market data',symbol:SYMBOL,timeframe:d.tf,candles:d.cs.length},
    freeze:{iso:FREEZE_ISO,timestamp:FREEZE,sourceIntegrity:integrity,rule:'Only events with entry time strictly after freeze are prospective evidence.'},
    rules:{realDataOnly:true,noSyntheticData:true,causal:true,parametersFrozen:true,noOosSelection:true,prospectiveOnly:true},
    historicalContext:{events:rows.length,closed:agg(rows).closed,totalR:agg(rows).totalR,audit:{ok:audit.ok,events:audit.eventsChecked,violations:audit.violations}},
    holdout:{samples:prospective.length,summary:agg(prospective),removeTop3:agg(rem),blockBootstrap:block,secondHalf:agg(second),folds:fs.map((x,i)=>({fold:i+1,...agg(x)})),maxLossStreak:maxLossStreak(closed),drawdown:drawdown(closed),checks,allPass},
    events:prospective};
}
function fnv1(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
(async()=>{
  await fs.mkdir(OUT,{recursive:true});const integrity=verifyFrozenSources(),E=await engine(),all=[];
  for(const raw of TFS){const tf=raw.trim(),d=await data(tf),r=run(d,E);all.push(r);await fs.writeFile(path.join(OUT,SYMBOL+'_'+tf+'_V5.6.json'),JSON.stringify(r,null,2));
    console.log(tf,{holdoutClosed:r.holdout.summary.closed,totalR:r.holdout.summary.totalR,top3:r.holdout.removeTop3.totalR,blockP05:r.holdout.blockBootstrap?.p05??null,allPass:r.holdout.allPass})}
  const summary={version:'V5.6-PROSPECTIVE-HOLDOUT',generatedAt:new Date().toISOString(),freeze:FREEZE_ISO,timeframes:all.map(r=>({timeframe:r.source.timeframe,candles:r.source.candles,historicalContext:r.historicalContext,holdout:r.holdout}))};
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2));
  const md=['# GannWyck V5.6 Prospective Holdout','',`Freeze: ${FREEZE_ISO}`,'','This run does not treat pre-freeze history as validation evidence. A holdout becomes evaluable only as new post-freeze Binance candles accumulate.','',...all.map(r=>`## ${r.source.timeframe}\n- Closed holdout: ${r.holdout.summary.closed}\n- Total R: ${r.holdout.summary.totalR.toFixed(2)}\n- After top-3 removal: ${r.holdout.removeTop3.totalR.toFixed(2)}\n- Block bootstrap P05: ${r.holdout.blockBootstrap?.p05==null?'NA':r.holdout.blockBootstrap.p05.toFixed(2)}\n- All pre-registered checks: **${r.holdout.allPass?'PASS':'PENDING/FAIL'}**`)].join('\n');
  await fs.writeFile(path.join(OUT,'SUMMARY.md'),md);
})();