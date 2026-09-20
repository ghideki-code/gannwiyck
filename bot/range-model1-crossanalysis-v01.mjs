// GannWyck Range -> Model 1 Cross Analysis V0.7
// RESEARCH ONLY. Real Binance Spot data. No synthetic data. Does not modify frozen V5.6 model/protocol.
import fs from "node:fs";
import vm from "node:vm";
const MODEL_SOURCE = "/* GannWyck Model 1 engine. Experimental, causal and rule-based. */\n(function(root){'use strict';\nconst EPS=1e-12;\nconst finite=v=>Number.isFinite(Number(v));\nfunction normalizeCandles(candles){return(candles||[]).map((c,i)=>({index:Number.isInteger(c.index)?c.index:i,time:c.time??c.timestamp??i,open:+c.open,high:+c.high,low:+c.low,close:+c.close,volume:finite(c.volume)?+c.volume:null})).filter(c=>[c.open,c.high,c.low,c.close].every(finite));}\nfunction detectTrend(cs,lookback=20){if(cs.length<3)return'unknown';const n=Math.min(lookback,cs.length-1),a=cs[cs.length-1-n].close,b=cs.at(-1).close;if(b>a*1.002)return'up';if(b<a*.998)return'down';return'range';}\nfunction findRange(cs,trend,lookback=80){const s=Math.max(0,cs.length-lookback),a=cs.slice(s);if(!a.length)return null;let hi=a[0],lo=a[0];for(const c of a){if(c.high>hi.high)hi=c;if(c.low<lo.low)lo=c}const rangeHigh=hi.high,rangeLow=lo.low,range=rangeHigh-rangeLow;if(!(range>EPS))return null;return{trend,rangeHigh,rangeLow,range,highIndex:hi.index,lowIndex:lo.index,midpoint:rangeLow+range*.5};}\nfunction calculateDL(r){const R=r.range;return{upper:r.rangeLow+R*1.35,zero:r.rangeLow,lower:r.rangeLow-R*.35,upperFromHigh:r.rangeHigh+R*.35};}\nfunction inDL(p,dl){return p<=dl.upper+EPS&&p>=dl.lower-EPS;}\nfunction inExtreme(p,dl,trend){return trend==='up'?p<=dl.zero+EPS&&p>=dl.lower-EPS:p>=dl.zero-EPS&&p<=dl.upperFromHigh+EPS;}\nfunction findTaps(cs,dl,trend){const candidates=[];for(const c of cs){const price=trend==='up'?c.low:c.high;if(inDL(price,dl))candidates.push({index:c.index,time:c.time,price,type:trend==='up'?'demand':'supply',high:c.high,low:c.low,close:c.close});}if(!candidates.length)return[];const first=candidates[0],after=candidates.filter(t=>t.index>first.index);if(!after.length)return[first];const second=trend==='up'?after.reduce((best,t)=>!best||t.high>best.high?t:best,null):after.reduce((best,t)=>!best||t.low<best.low?t:best,null);return second?[first,second]:[first];}\nfunction detectBosAfter(cs,tap2,trend){if(!tap2)return null;const start=tap2.index+1;if(start>=cs.length)return null;let level=trend==='up'?-Infinity:Infinity;for(let i=0;i<start;i++){if(trend==='up')level=Math.max(level,cs[i].high);else level=Math.min(level,cs[i].low);}for(let i=start;i<cs.length;i++){if(trend==='up'&&cs[i].close>level+EPS)return{index:cs[i].index,type:'bullish',level,close:cs[i].close};if(trend==='down'&&cs[i].close<level-EPS)return{index:cs[i].index,type:'bearish',level,close:cs[i].close};}return null;}\nfunction findTap3After(cs,dl,trend,bosIndex,minDisplacement=2){if(!Number.isInteger(bosIndex))return null;const minBars=Math.max(1,Number.isInteger(minDisplacement)?minDisplacement:2);for(let i=bosIndex+minBars;i<cs.length;i++){const c=cs[i],price=trend==='up'?c.low:c.high;if(inExtreme(price,dl,trend))return{index:c.index,time:c.time,price,type:trend==='up'?'demand':'supply',high:c.high,low:c.low,close:c.close,displacement:i-bosIndex};}return null;}\nfunction buildSignal(cs,r,taps,bos,tap3,trend){if(!r||taps.length<2||!bos||!tap3||tap3.index>=cs.length-1)return null;const entryIndex=tap3.index+1,entry=cs[entryIndex].open,stop=trend==='up'?tap3.low:tap3.high,target=trend==='up'?r.rangeHigh:r.rangeLow,risk=trend==='up'?entry-stop:stop-entry,reward=trend==='up'?target-entry:entry-target;const directional=trend==='up'?target>entry+EPS&&stop<entry-EPS:target<entry-EPS&&stop>entry+EPS;if(!directional||risk<=EPS||reward<=EPS)return null;return{side:trend==='up'?'LONG':'SHORT',entry,stop,target,risk,reward,rr:reward/risk,confirmationIndex:bos.index,tap3Index:tap3.index,entryIndex,entryReason:'next_open_after_tap3',valid:true};}\nfunction findFirstCausalSetup(cs,t2Index,opt={}){const snapshot=cs.slice(0,t2Index+1),trend=detectTrend(snapshot,opt.trendLookback||20);if(trend!=='up'&&trend!=='down')return null;const range=findRange(snapshot,trend,opt.lookback||80);if(!range)return null;const dl=calculateDL(range),taps=findTaps(snapshot,dl,trend);if(taps.length<2||taps[1].index!==t2Index)return null;const tap2=taps[1],bos=detectBosAfter(cs,tap2,trend);if(!bos)return null;const tap3=findTap3After(cs,dl,trend,bos.index,opt.minTap3Displacement??2);if(!tap3)return null;const signal=buildSignal(cs,range,taps,bos,tap3,trend);if(!signal)return null;return{trend,range,dl,taps,bos,tap3,signal};}\nfunction analyzeCausal(input,opt={}){const cs=normalizeCandles(input),warmup=Math.max(20,opt.warmup||100);let latest=null;for(let i=cs.length-2;i>=warmup;i--){const candidate=findFirstCausalSetup(cs,i,opt);if(candidate){latest={...candidate,t2Index:i};break;}}if(!latest)return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,signal:null,rejection:'no_complete_causal_setup',dataAsOf:cs.at(-1)?.time??null};const entryIndex=latest.signal.entryIndex,lastIndex=cs.length-1;const lifecycle=entryIndex===lastIndex?'ACTIVE_ENTRY':entryIndex===lastIndex-1?'JUST_ENTERED':'HISTORICAL';return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,...latest,lifecycle,dataAsOf:cs.at(-1)?.time??null,rules:{tapsRequired:3,bosBeforeTap3:true,bosConfirmedByClose:true,target:'range snapshot frozen at T2',stop:'Tap 3 candle extreme',entry:'next candle open after Tap 3',dlFib:[1.35,0,-.35],minTap3Displacement:opt.minTap3Displacement??2}};}\nfunction outcome(cs,signal,maxBars=120){if(!signal||!signal.valid)return{status:'invalid',bars:0,r:0};const start=signal.entryIndex;for(let i=start;i<Math.min(cs.length,start+maxBars);i++){const c=cs[i];if(signal.side==='LONG'){const hitStop=c.low<=signal.stop,hitTarget=c.high>=signal.target;if(hitStop&&hitTarget)return{status:'ambiguous',index:i,time:c.time,bars:i-start,r:null};if(hitStop)return{status:'stop',index:i,time:c.time,bars:i-start,r:-1};if(hitTarget)return{status:'target',index:i,time:c.time,bars:i-start,r:signal.rr};}else{const hitStop=c.high>=signal.stop,hitTarget=c.low<=signal.target;if(hitStop&&hitTarget)return{status:'ambiguous',index:i,time:c.time,bars:i-start,r:null};if(hitStop)return{status:'stop',index:i,time:c.time,bars:i-start,r:-1};if(hitTarget)return{status:'target',index:i,time:c.time,bars:i-start,r:signal.rr};}}return{status:'open',bars:Math.max(0,Math.min(cs.length,start+maxBars)-start),r:0};}\nfunction backtestCausal(input,opt={}){const cs=normalizeCandles(input),warmup=Math.max(20,opt.warmup||100),events=[],seen=new Set();for(let t2=warmup;t2<cs.length-1;t2++){const setup=findFirstCausalSetup(cs,t2,opt);if(!setup||setup.taps[1].index!==t2)continue;const s=setup.signal,key=[s.entryIndex,s.side].join(':');if(seen.has(key))continue;seen.add(key);const o=outcome(cs,s,opt.maxBars||120),t1=setup.taps[0],t2c=setup.taps[1],t3=setup.tap3,range=setup.range;events.push({id:events.length+1,time:cs[s.entryIndex]?.time,setupTime:cs[s.confirmationIndex]?.time,side:s.side,entry:s.entry,stop:s.stop,target:s.target,risk:s.risk,reward:s.reward,rr:s.rr,r:o.r,t1:t1.index,t2:t2c.index,bos:setup.bos.index,t3:t3.index,confirmationIndex:s.confirmationIndex,entryIndex:s.entryIndex,rangeHigh:range.rangeHigh,rangeLow:range.rangeLow,rangeSize:range.range,trend:setup.trend,rangePctEntry:s.entry!==0?range.range/Math.abs(s.entry):null,t1ToT2:t2c.index-t1.index,t2ToBOS:setup.bos.index-t2c.index,bosToT3:t3.index-setup.bos.index,bosLevel:setup.bos.level,bosDistance:Math.abs(s.entry-setup.bos.level),outcome:o.status,outcomeIndex:o.index??null,bars:o.bars,causal:true});}\nconst closed=events.filter(e=>e.outcome==='target'||e.outcome==='stop'),wins=closed.filter(e=>e.outcome==='target'),losses=closed.filter(e=>e.outcome==='stop'),ambiguous=events.filter(e=>e.outcome==='ambiguous'),totalR=closed.reduce((a,e)=>a+e.r,0),grossWinR=wins.reduce((a,e)=>a+e.r,0),grossLossR=Math.abs(losses.reduce((a,e)=>a+e.r,0));return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,candlesCount:cs.length,events,summary:{signals:events.length,closed:closed.length,target:wins.length,stop:losses.length,open:events.filter(e=>e.outcome==='open').length,ambiguous:ambiguous.length,winRate:closed.length?wins.length/closed.length:null,totalR,avgR:closed.length?totalR/closed.length:null,avgWinR:wins.length?grossWinR/wins.length:null,avgLossR:losses.length?grossLossR/losses.length:null,expectancyR:closed.length?totalR/closed.length:null,profitFactor:grossLossR?grossWinR/grossLossR:null}};}\nfunction same(a,b){const n=(x)=>Number.isFinite(Number(x))?Number(x):null;return a.side===b.side&&a.t1===b.t1&&a.t2===b.t2&&a.bos===b.bos&&a.t3===b.t3&&a.entryIndex===b.entryIndex&&Math.abs(n(a.entry)-n(b.entry))<1e-9&&Math.abs(n(a.stop)-n(b.stop))<1e-9&&Math.abs(n(a.target)-n(b.target))<1e-9;}\nfunction lookaheadAudit(input,opt={}){const cs=normalizeCandles(input),bt=backtestCausal(cs,opt),violations=[];for(const e of bt.events){const prefix=cs.slice(0,e.entryIndex+1),replay=findFirstCausalSetup(prefix,e.t2,opt);if(!replay||!same(e,{...replay.signal,t1:replay.taps[0].index,t2:replay.taps[1].index,bos:replay.bos.index,t3:replay.tap3.index}))violations.push({eventId:e.id,t2:e.t2,entryIndex:e.entryIndex,reason:'signal_not_reproducible_using_only_candles_through_entry'});}return{ok:violations.length===0,eventsChecked:bt.events.length,violations,method:'for each event, replay is truncated at entry; no candle after entry can participate in trend/range/taps/BOS/T3/entry reconstruction'};}\nfunction backtest(input,opt={}){return backtestCausal(input,opt);}\nroot.GannWyckModel1={analyze:analyzeCausal,analyzeCausal,backtest,backtestCausal,outcome,normalizeCandles,detectTrend,findRange,calculateDL,findTaps,detectBosAfter,findTap3After,lookaheadAudit};\n})(typeof window!=='undefined'?window:globalThis);";
const sandbox = { console, globalThis: {} };
vm.createContext(sandbox);
vm.runInContext(MODEL_SOURCE, sandbox);
const M = sandbox.globalThis.GannWyckModel1;

const SYMBOL = process.env.SYMBOL || "BTCUSDT";
const MAX_CANDLES = Math.max(200, Number(process.env.MAX_CANDLES || 5000));
const TIMEFRAMES = (process.env.TIMEFRAMES || "1h,4h,12h,1d,2d,3d,5d,1w,1M").split(",").map(s=>s.trim()).filter(Boolean);
const PIVOT_LEN = Number(process.env.PIVOT_LEN || 5);
const MIN_BARS = Number(process.env.MIN_BARS || 12);
const MAX_BARS = Number(process.env.MAX_BARS || 300);

async function fetchKlines(interval) {
  const BASE = "https://data-api.binance.vision/api/v3/klines";
  const customDays = interval==="2d"||interval==="5d";
  const nativeMs = ({"1h":3600000,"4h":14400000,"12h":43200000,"1d":86400000,"3d":259200000,"1w":604800000,"1M":2592000000})[interval];
  const sourceInterval = customDays ? "1d" : interval;
  const sourceNeed = customDays ? MAX_CANDLES*Number(interval.slice(0,-1))+20 : MAX_CANDLES;
  let end = Date.now() - (nativeMs || 86400000), all = [];
  while (all.length < sourceNeed) {
    const u = new URL(BASE);
    u.searchParams.set("symbol", SYMBOL); u.searchParams.set("interval", sourceInterval);
    u.searchParams.set("limit", "1000"); u.searchParams.set("endTime", String(end));
    let rows = null;
    for (let attempt=1; attempt<=5; attempt++) {
      const r = await fetch(u);
      if (r.ok) { rows = await r.json(); break; }
      if (r.status===429 || r.status>=500) { await new Promise(x=>setTimeout(x, attempt*1000)); continue; }
      throw new Error("Binance HTTP "+r.status+" "+interval);
    }
    if (!rows || !rows.length) break;
    all.push(...rows);
    if (rows.length < 1000) break;
    end = Number(rows[0][0]) - 1;
    await new Promise(x=>setTimeout(x, 80));
  }
  const byOpen = new Map(); for (const x of all) byOpen.set(Number(x[0]), x);
  let rows=[...byOpen.values()].sort((a,b)=>Number(a[0])-Number(b[0]));
  if(customDays){
    const n=Number(interval.slice(0,-1)), day=86400000, groups=new Map();
    for(const x of rows){ const bucket=Math.floor(Number(x[0])/day/n)*n; let g=groups.get(bucket); if(!g){g={t:bucket,o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[5]),ct:Number(x[6]),q:Number(x[7]),tr:Number(x[8]),tb:Number(x[9]),tq:Number(x[10])};groups.set(bucket,g);} else {g.h=Math.max(g.h,Number(x[2]));g.l=Math.min(g.l,Number(x[3]));g.c=Number(x[4]);g.v+=Number(x[5]);g.ct=Number(x[6]);g.q+=Number(x[7]);g.tr+=Number(x[8]);g.tb+=Number(x[9]);g.tq+=Number(x[10]);} }
    rows=[...groups.values()].sort((a,b)=>a.t-b.t).map(g=>[g.t,String(g.o),String(g.h),String(g.l),String(g.c),String(g.v),g.ct,String(g.q),g.tr,String(g.tb),String(g.tq),"0"]);
  }
  return rows.slice(-MAX_CANDLES);
}
function pivots(c,i,type) {
  if(i<PIVOT_LEN || i>=c.length-PIVOT_LEN) return false;
  const v=type==="H"?c[i].high:c[i].low;
  for(let j=1;j<=PIVOT_LEN;j++) {
    if(type==="H" && (v<=c[i-j].high || v<c[i+j].high)) return false;
    if(type==="L" && (v>=c[i-j].low || v>c[i+j].low)) return false;
  }
  return true;
}
function buildRanges(cs) {
  let ph=null,pl=null,active=null; const ranges=[];
  const closeRange=(r,end,invalidated)=> {
    r.end=end; r.duration=end-r.start; r.widthPct=r.low?100*(r.high-r.low)/Math.abs(r.low):null;
    r.closed=!!invalidated; ranges.push(r);
  };
  for(let i=0;i<cs.length;i++) {
    const k=i-PIVOT_LEN;
    if(k>=0){if(pivots(cs,k,"H"))ph={i:k,v:cs[k].high};if(pivots(cs,k,"L"))pl={i:k,v:cs[k].low};}
    if(ph&&pl&&!active) {
      const start=Math.min(ph.i,pl.i), high=Math.max(ph.v,pl.v), low=Math.min(ph.v,pl.v);
      if(high>low && start>=0) active={start,high,low,highBar:ph.i,lowBar:pl.i,direction:pl.i<ph.i?"LOW → HIGH":"HIGH → LOW",
        midTouches:0,boundaryTouches:0,internalBars:0,lastMid:-99,maxMidExcursion:0};
    }
    if(!active) continue;
    const mid=active.low+(active.high-active.low)/2, width=active.high-active.low;
    if(cs[i].low<=mid&&cs[i].high>=mid&&i>active.lastMid+1){active.midTouches++;active.lastMid=i;}
    if(cs[i].high>=active.high||cs[i].low<=active.low)active.boundaryTouches++;
    if(cs[i].high<active.high&&cs[i].low>active.low)active.internalBars++;
    if(width>0)active.maxMidExcursion=Math.max(active.maxMidExcursion,Math.max(Math.abs(cs[i].high-mid),Math.abs(cs[i].low-mid))/width);
    if(cs[i].close>active.high||cs[i].close<active.low){
      active.invalidation=cs[i].close>active.high?"UP":"DOWN"; active.invalidationIndex=i; closeRange(active,i,true); active=null;
    }
  }
  if(active)closeRange(active,cs.length-1,false);
  return ranges.map(r=>({...r,internalShare:r.duration>0?r.internalBars/r.duration:0,durationDays:null}));
}
function eventForRanges(cs,ranges,tf) {
  const bt=M.backtestCausal(cs,{warmup:100,maxBars:120,minTap3Displacement:2});
  const events=bt.events.map(e=>{
    const candidates=ranges.filter(r=>r.start<=e.t2&&r.end>=e.t2);
    const r=candidates.length?candidates[candidates.length-1]:null;
    if(!r)return {...e,rangeLink:null};
    const dayFactor=({"1h":1/24,"4h":4/24,"12h":12/24,"1d":1})[tf]||0;
    const diag={
      durationDays:+(r.duration*dayFactor).toFixed(3),
      widthPct:+(r.widthPct||0).toFixed(3),
      midpointInteraction:r.midTouches>=1,
      durationAtLeastOneDay:r.duration*dayFactor>=1,
      internalContainment:r.internalShare>=0.40,
      repeatedBoundaryInteraction:r.boundaryTouches>=3
    };
    return {...e,rangeLink:{start:r.start,end:r.end,duration:r.duration,high:r.high,low:r.low,direction:r.direction,
      midTouches:r.midTouches,boundaryTouches:r.boundaryTouches,internalShare:+r.internalShare.toFixed(3),diagnostics:diag}};
  });
  const linked=events.filter(e=>e.rangeLink); const cycles=cycleSummary(linked);
  const closed=linked.filter(e=>e.outcome==="target"||e.outcome==="stop");
  const avg=(a,k)=>a.length?a.reduce((s,x)=>s+(Number(x[k])||0),0)/a.length:null;
  const byDiag={};
  for(const key of ["durationAtLeastOneDay","midpointInteraction","internalContainment","repeatedBoundaryInteraction"]){
    const yes=closed.filter(e=>e.rangeLink.diagnostics[key]), no=closed.filter(e=>!e.rangeLink.diagnostics[key]);
    byDiag[key]={yes:{n:yes.length,totalR:yes.reduce((s,e)=>s+e.r,0),avgR:avg(yes,"r")},no:{n:no.length,totalR:no.reduce((s,e)=>s+e.r,0),avgR:avg(no,"r")}};
  }
  const cycleRows = cycles.cycles;
  const multi = cycleRows.filter(x=>x.eventCount>1);
  const sameSide = multi.filter(x=>new Set(x.events.map(e=>e.side)).size===1);
  const mixedSide = multi.filter(x=>new Set(x.events.map(e=>e.side)).size>1);
  const repeatedT2 = linked.length - new Set(linked.map(e=>e.t2)).size;
  const cycleDependence = {
    status:"diagnostic_only",
    cycles:cycleRows.length,
    events:linked.length,
    singleEventCycles:cycleRows.filter(x=>x.eventCount===1).length,
    multiEventCycles:multi.length,
    multiEventShare:cycleRows.length ? multi.length/cycleRows.length : null,
    eventConcentrationInMultiCycles:linked.length ? multi.reduce((s,x)=>s+x.eventCount,0)/linked.length : null,
    sameSideMultiEventCycles:sameSide.length,
    mixedSideMultiEventCycles:mixedSide.length,
    repeatedT2,
    eventToCycleRatio:cycleRows.length ? linked.length/cycleRows.length : null,
    note:"Multiple Model 1 events linked to the same research Range are not independent observations. This diagnostic does not decide whether the methodology permits multiple entries within one Range."
  };
  return {tf,candles:cs.length,modelSignals:bt.summary.signals,modelClosed:bt.summary.closed,modelTotalR:bt.summary.totalR,linked:linked.length,linkedClosed:closed.length,linkedClosedR:closed.reduce((s,e)=>s+e.r,0),byDiagnostic:byDiag,cycleSummary:cycles,cycleDependence,events:linked};
}
(async()=>{
 const result=[];
 for(const tf of TIMEFRAMES){
   const raw=await fetchKlines(tf);
   const cs=M.normalizeCandles(raw.map(x=>({time:x[0],open:x[1],high:x[2],low:x[3],close:x[4],volume:x[5]})));
   const ranges=buildRanges(cs);
   const audit=eventForRanges(cs,ranges,tf);
   const closed=audit.events.filter(e=>e.outcome==="target"||e.outcome==="stop");
   const sorted=[...closed].sort((a,b)=>b.r-a.r);
   const quantile=(xs,p)=>xs.length?xs[Math.min(xs.length-1,Math.floor((xs.length-1)*p))]:null;
   const rrValues=closed.map(e=>e.rr).sort((a,b)=>a-b);
   const caps=[2,3,5,10].map(cap=>({cap,totalR:+closed.reduce((s,e)=>s+(e.outcome==="target"?Math.min(e.r,cap):-1),0).toFixed(6)}));
   const topR=n=>sorted.slice(0,n).reduce((s,e)=>s+e.r,0);
   const seenRanges=new Set(),onePerRange=[];
   for(const e of [...closed].sort((a,b)=>a.t2-b.t2)){
     const k=e.rangeLink?[e.rangeLink.start,e.rangeLink.end,e.rangeLink.high,e.rangeLink.low].join("|"):"NO_RANGE";
     if(!seenRanges.has(k)){seenRanges.add(k);onePerRange.push(e);}
   }
   const eventMechanics=closed.map(e=>({
     t3Price:cs[e.t3]?.close??null,
     id:e.id,side:e.side,t2:e.t2,t3:e.t3,bos:e.bos,entryIndex:e.entryIndex,outcomeIndex:e.outcomeIndex,
     t2ToBos:e.bos!=null?e.bos-e.t2:null,
     bosToT3:e.bos!=null?e.t3-e.bos:null,
     t3ToEntry:e.entryIndex!=null?e.entryIndex-e.t3:null,
     rangeSize:e.rangeSize,
     risk:e.risk,reward:e.reward,rr:e.rr,r:e.r,
     stopToRange:e.rangeSize?+(e.risk/e.rangeSize).toFixed(6):null,
     targetToRange:e.rangeSize?+(e.reward/e.rangeSize).toFixed(6):null,outcome:e.outcome,r:e.r,
     t3DistanceToRange:(e.rangeSize&&Number.isFinite(cs[e.t3]?.close))?+(Math.abs(cs[e.t3].close-(e.side==="LONG"?e.rangeLow:e.rangeHigh))/e.rangeSize).toFixed(6):null
   }));
   function groupStats(rows,keyFn){const groups=new Map();for(const e of rows){const k=keyFn(e);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}return [...groups.entries()].map(([group,es])=>({group,n:es.length,wins:es.filter(e=>e.outcome==="target").length,losses:es.filter(e=>e.outcome==="stop").length,totalR:+es.reduce((s,e)=>s+e.r,0).toFixed(6),avgR:+(es.reduce((s,e)=>s+e.r,0)/es.length).toFixed(6),medianR:(()=>{const v=es.map(e=>e.r).sort((a,b)=>a-b);return v.length?v[Math.floor((v.length-1)/2)]:null})()}));
}
   const v=(x)=>Number.isFinite(x)?x:null;
   const tap3Quality={
     t2ToBOS:groupStats(closed,e=>e.bos-e.t2<=5?"0-5":e.bos-e.t2<=10?"6-10":e.bos-e.t2<=20?"11-20":">20"),
     bosToT3:groupStats(closed,e=>e.t3-e.bos<=5?"2-5":e.t3-e.bos<=10?"6-10":e.t3-e.bos<=20?"11-20":">20"),
     stopToRange:groupStats(eventMechanics.filter(e=>v(e.stopToRange)!=null),e=>e.stopToRange<=0.02?"<=2%":e.stopToRange<=0.05?"2-5%":e.stopToRange<=0.10?"5-10%":">10%"),
     t3DistanceToRange:groupStats(eventMechanics.filter(e=>v(e.t3DistanceToRange)!=null),e=>e.t3DistanceToRange<=0.10?"<=10%":e.t3DistanceToRange<=0.25?"10-25%":e.t3DistanceToRange<=0.50?"25-50%":">50%")
   };
   const byCycle=new Map();
   for(const e of closed){
     const k=e.rangeLink?[e.rangeLink.start,e.rangeLink.end,e.rangeLink.high,e.rangeLink.low].join("|"):"NO_RANGE";
     if(!byCycle.has(k)) byCycle.set(k,[]);
     byCycle.get(k).push(e);
   }
   const cycleAudit=[...byCycle.values()].map(es=>({
     rangeStart:es[0]?.rangeLink?.start??null,
     rangeEnd:es[0]?.rangeLink?.end??null,
     events:es.length,
     totalR:+es.reduce((s,e)=>s+e.r,0).toFixed(6),
     maxR:+Math.max(...es.map(e=>e.r)).toFixed(6),
     wins:es.filter(e=>e.outcome==="target").length,
     losses:es.filter(e=>e.outcome==="stop").length,
     t3ToEntry:es.map(e=>e.entryIndex!=null?e.entryIndex-e.t3:null).filter(x=>x!=null)
   }));
   audit.tap3Quality=tap3Quality;
   audit.tap3Audit={
     events:eventMechanics,
     summary:{
       avgT2ToBOS:closed.length?+(closed.reduce((s,e)=>s+(e.bos!=null?e.bos-e.t2:0),0)/closed.length).toFixed(3):null,
       avgBOSToT3:closed.length?+(closed.reduce((s,e)=>s+(e.bos!=null?e.t3-e.bos:0),0)/closed.length).toFixed(3):null,
       avgT3ToEntry:closed.length?+(closed.reduce((s,e)=>s+(e.entryIndex!=null?e.entryIndex-e.t3:0),0)/closed.length).toFixed(3):null,
       avgStopToRange:closed.length?+(closed.reduce((s,e)=>s+(e.risk/e.rangeSize),0)/closed.length).toFixed(6):null,
       avgTargetToRange:closed.length?+(closed.reduce((s,e)=>s+(e.reward/e.rangeSize),0)/closed.length).toFixed(6):null
     },
     cycleAudit
   };
   audit.mfeMaeAudit = (function(){
     const rows = audit.tap3Audit.events.map(e=>{
       const start=e.entryIndex;
       const stopAt=Number.isInteger(e.outcomeIndex)?e.outcomeIndex+1:start+120; const end=Math.min(cs.length,start+120,stopAt);
       if(!Number.isInteger(start)||start>=end)return null;
       let mfe=0,mae=0,mfeBar=null,maeBar=null;
       for(let i=start;i<end;i++){
         const c=cs[i];
         const favorable=e.side==="LONG" ? (c.high-e.entry)/e.risk : (e.entry-c.low)/e.risk;
         const adverse=e.side==="LONG" ? (e.entry-c.low)/e.risk : (c.high-e.entry)/e.risk;
         if(favorable>mfe){mfe=favorable;mfeBar=i-start;}
         if(adverse>mae){mae=adverse;maeBar=i-start;}
       }
       const outcomeBar=e.outcomeIndex!=null?e.outcomeIndex-start:null;
       return {id:e.id,side:e.side,outcome:e.outcome,r:e.r,mfe:+mfe.toFixed(6),mae:+mae.toFixed(6),mfeBar,maeBar,outcomeBar};
     }).filter(Boolean);
     const closed=rows.filter(x=>x.outcome==="target"||x.outcome==="stop");
     const median=a=>{const v=a.slice().sort((x,y)=>x-y);return v.length?v[Math.floor((v.length-1)/2)]:null;};
     const avg=(a,k)=>a.length?a.reduce((s,x)=>s+(Number(x[k])||0),0)/a.length:null;
     return {windowBars:120,n:closed.length,avgMFE:avg(closed,"mfe"),medianMFE:median(closed.map(x=>x.mfe)),avgMAE:avg(closed,"mae"),medianMAE:median(closed.map(x=>x.mae)),avgMFEBar:avg(closed,"mfeBar"),avgMAEBar:avg(closed,"maeBar"),avgOutcomeBar:avg(closed,"outcomeBar"),events:rows};
   })();
   audit.mfeMaeGroups = (function(){
     const ev=audit.mfeMaeAudit.events.filter(e=>e.outcome==="target"||e.outcome==="stop");
     const mk=(key,labels,ranges)=>ranges.map((b,i)=>{const rows=ev.filter(e=>e[key]>=b[0]&&(b[1]==null||e[key]<b[1]));const r=rows.reduce((s,e)=>s+(Number(e.r)||0),0);const sv=rows.map(e=>e.r).sort((a,b)=>a-b);return {bin:labels[i],n:rows.length,wins:rows.filter(e=>e.outcome==="target").length,losses:rows.filter(e=>e.outcome==="stop").length,totalR:+r.toFixed(6),avgR:rows.length?+(r/rows.length).toFixed(6):null,medianR:rows.length?+sv[Math.floor((sv.length-1)/2)].toFixed(6):null};});
     const labels=["<=0","0-0.5R","0.5-1R","1-2R",">2R"],ranges=[[0,0.000001],[0.000001,0.5],[0.5,1],[1,2],[2,null]];
     return {mfe:mk("mfe",labels,ranges),mae:mk("mae",labels,ranges),timeToMFE:mk("mfeBar",["0-2","3-10","11-30",">30"],[[0,3],[3,11],[11,31],[31,null]]),timeToMAE:mk("maeBar",["0-2","3-10","11-30",">30"],[[0,3],[3,11],[11,31],[31,null]])};
   })();
   audit.rrAudit={
     closed:closed.length,
     rrDistribution:{n:rrValues.length,median:quantile(rrValues,.5),p75:quantile(rrValues,.75),p90:quantile(rrValues,.9),p95:quantile(rrValues,.95),max:quantile(rrValues,1)},
     top1R:+topR(1).toFixed(6),
     top3R:+topR(3).toFixed(6),
     top1Share:audit.linkedClosedR?+(topR(1)/audit.linkedClosedR).toFixed(6):null,
     top3Share:audit.linkedClosedR?+(topR(3)/audit.linkedClosedR).toFixed(6):null,
     capSensitivity:caps,
     oneEventPerResearchRange:{
       selection:"earliest closed event by T2 within each research Range; outcome-blind",
       ranges:onePerRange.length,
       totalR:+onePerRange.reduce((s,e)=>s+e.r,0).toFixed(6),
       wins:onePerRange.filter(e=>e.outcome==="target").length,
       losses:onePerRange.filter(e=>e.outcome==="stop").length
     },
     mechanics:{
       avgRiskToRange:closed.length?+(closed.reduce((s,e)=>s+(e.risk/e.rangeSize),0)/closed.length).toFixed(6):null,
       avgRewardToRange:closed.length?+(closed.reduce((s,e)=>s+(e.reward/e.rangeSize),0)/closed.length).toFixed(6):null,
       maxRRTrade:(closed.length?[...closed].sort((a,b)=>b.rr-a.rr)[0]:null)?(()=>{const e=[...closed].sort((a,b)=>b.rr-a.rr)[0];return {id:e.id,rr:e.rr,r:e.r,side:e.side,t2:e.t2,t3:e.t3};})():null
     }
   };
   result.push(audit);
 }
 console.log(JSON.stringify({version:"V0.6",symbol:SYMBOL,source:"Binance Spot REST",maxCandles:MAX_CANDLES,pivotLen:PIVOT_LEN,minBars:MIN_BARS,maxBars:MAX_BARS,results:result},null,2));
})().catch(e=>{console.error(e);process.exit(1);});

// V0.6 cycle audit helper: groups Model 1 events by the same linked research Range.
// A cycle is Range -> candidate T2 -> BOS -> T3 -> entry/outcome. Research only.
function cycleAudit(events){const groups=new Map();for(const e of events){if(!e.rangeLink)continue;const key=[e.rangeLink.start,e.rangeLink.end,e.rangeLink.high,e.rangeLink.low].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}return [...groups.values()].map((es,i)=>({cycle:i+1,range:es[0].rangeLink,events:es.map(e=>({id:e.id,t2:e.t2,bos:e.bos,t3:e.t3,entryIndex:e.entryIndex,side:e.side,outcome:e.outcome,r:e.r})),eventCount:es.length,closed:es.filter(e=>e.outcome==='target'||e.outcome==='stop').length,totalR:es.filter(e=>Number.isFinite(e.r)).reduce((s,e)=>s+e.r,0)}));}
function cycleSummary(events){const cycles=cycleAudit(events);const multi=cycles.filter(c=>c.eventCount>1);return{cycles:cycles.length,multiEventCycles:multi.length,events:events.length,closed:events.filter(e=>e.outcome==='target'||e.outcome==='stop').length,totalR:events.filter(e=>Number.isFinite(e.r)).reduce((s,e)=>s+e.r,0),multiEventR:multi.reduce((s,c)=>s+c.totalR,0),maxEventsPerRange:cycles.length?Math.max(...cycles.map(c=>c.eventCount)):0,cycles};}
