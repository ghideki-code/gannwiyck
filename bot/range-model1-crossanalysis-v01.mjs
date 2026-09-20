// GannWyck Range -> Model 1 Cross Analysis V0.2
// RESEARCH ONLY. Real Binance Spot data. No synthetic data. Does not modify frozen V5.6 model/protocol.
const fs = require("fs");
const vm = require("vm");
const MODEL_SOURCE = "/* GannWyck Model 1 engine. Experimental, causal and rule-based. */\n(function(root){'use strict';\nconst EPS=1e-12;\nconst finite=v=>Number.isFinite(Number(v));\nfunction normalizeCandles(candles){return(candles||[]).map((c,i)=>({index:Number.isInteger(c.index)?c.index:i,time:c.time??c.timestamp??i,open:+c.open,high:+c.high,low:+c.low,close:+c.close,volume:finite(c.volume)?+c.volume:null})).filter(c=>[c.open,c.high,c.low,c.close].every(finite));}\nfunction detectTrend(cs,lookback=20){if(cs.length<3)return'unknown';const n=Math.min(lookback,cs.length-1),a=cs[cs.length-1-n].close,b=cs.at(-1).close;if(b>a*1.002)return'up';if(b<a*.998)return'down';return'range';}\nfunction findRange(cs,trend,lookback=80){const s=Math.max(0,cs.length-lookback),a=cs.slice(s);if(!a.length)return null;let hi=a[0],lo=a[0];for(const c of a){if(c.high>hi.high)hi=c;if(c.low<lo.low)lo=c}const rangeHigh=hi.high,rangeLow=lo.low,range=rangeHigh-rangeLow;if(!(range>EPS))return null;return{trend,rangeHigh,rangeLow,range,highIndex:hi.index,lowIndex:lo.index,midpoint:rangeLow+range*.5};}\nfunction calculateDL(r){const R=r.range;return{upper:r.rangeLow+R*1.35,zero:r.rangeLow,lower:r.rangeLow-R*.35,upperFromHigh:r.rangeHigh+R*.35};}\nfunction inDL(p,dl){return p<=dl.upper+EPS&&p>=dl.lower-EPS;}\nfunction inExtreme(p,dl,trend){return trend==='up'?p<=dl.zero+EPS&&p>=dl.lower-EPS:p>=dl.zero-EPS&&p<=dl.upperFromHigh+EPS;}\nfunction findTaps(cs,dl,trend){const candidates=[];for(const c of cs){const price=trend==='up'?c.low:c.high;if(inDL(price,dl))candidates.push({index:c.index,time:c.time,price,type:trend==='up'?'demand':'supply',high:c.high,low:c.low,close:c.close});}if(!candidates.length)return[];const first=candidates[0],after=candidates.filter(t=>t.index>first.index);if(!after.length)return[first];const second=trend==='up'?after.reduce((best,t)=>!best||t.high>best.high?t:best,null):after.reduce((best,t)=>!best||t.low<best.low?t:best,null);return second?[first,second]:[first];}\nfunction detectBosAfter(cs,tap2,trend){if(!tap2)return null;const start=tap2.index+1;if(start>=cs.length)return null;let level=trend==='up'?-Infinity:Infinity;for(let i=0;i<start;i++){if(trend==='up')level=Math.max(level,cs[i].high);else level=Math.min(level,cs[i].low);}for(let i=start;i<cs.length;i++){if(trend==='up'&&cs[i].close>level+EPS)return{index:cs[i].index,type:'bullish',level,close:cs[i].close};if(trend==='down'&&cs[i].close<level-EPS)return{index:cs[i].index,type:'bearish',level,close:cs[i].close};}return null;}\nfunction findTap3After(cs,dl,trend,bosIndex,minDisplacement=2){if(!Number.isInteger(bosIndex))return null;const minBars=Math.max(1,Number.isInteger(minDisplacement)?minDisplacement:2);for(let i=bosIndex+minBars;i<cs.length;i++){const c=cs[i],price=trend==='up'?c.low:c.high;if(inExtreme(price,dl,trend))return{index:c.index,time:c.time,price,type:trend==='up'?'demand':'supply',high:c.high,low:c.low,close:c.close,displacement:i-bosIndex};}return null;}\nfunction buildSignal(cs,r,taps,bos,tap3,trend){if(!r||taps.length<2||!bos||!tap3||tap3.index>=cs.length-1)return null;const entryIndex=tap3.index+1,entry=cs[entryIndex].open,stop=trend==='up'?tap3.low:tap3.high,target=trend==='up'?r.rangeHigh:r.rangeLow,risk=trend==='up'?entry-stop:stop-entry,reward=trend==='up'?target-entry:entry-target;const directional=trend==='up'?target>entry+EPS&&stop<entry-EPS:target<entry-EPS&&stop>entry+EPS;if(!directional||risk<=EPS||reward<=EPS)return null;return{side:trend==='up'?'LONG':'SHORT',entry,stop,target,risk,reward,rr:reward/risk,confirmationIndex:bos.index,tap3Index:tap3.index,entryIndex,entryReason:'next_open_after_tap3',valid:true};}\nfunction findFirstCausalSetup(cs,t2Index,opt={}){const snapshot=cs.slice(0,t2Index+1),trend=detectTrend(snapshot,opt.trendLookback||20);if(trend!=='up'&&trend!=='down')return null;const range=findRange(snapshot,trend,opt.lookback||80);if(!range)return null;const dl=calculateDL(range),taps=findTaps(snapshot,dl,trend);if(taps.length<2||taps[1].index!==t2Index)return null;const tap2=taps[1],bos=detectBosAfter(cs,tap2,trend);if(!bos)return null;const tap3=findTap3After(cs,dl,trend,bos.index,opt.minTap3Displacement??2);if(!tap3)return null;const signal=buildSignal(cs,range,taps,bos,tap3,trend);if(!signal)return null;return{trend,range,dl,taps,bos,tap3,signal};}\nfunction analyzeCausal(input,opt={}){const cs=normalizeCandles(input),warmup=Math.max(20,opt.warmup||100);let latest=null;for(let i=cs.length-2;i>=warmup;i--){const candidate=findFirstCausalSetup(cs,i,opt);if(candidate){latest={...candidate,t2Index:i};break;}}if(!latest)return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,signal:null,rejection:'no_complete_causal_setup',dataAsOf:cs.at(-1)?.time??null};const entryIndex=latest.signal.entryIndex,lastIndex=cs.length-1;const lifecycle=entryIndex===lastIndex?'ACTIVE_ENTRY':entryIndex===lastIndex-1?'JUST_ENTERED':'HISTORICAL';return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,...latest,lifecycle,dataAsOf:cs.at(-1)?.time??null,rules:{tapsRequired:3,bosBeforeTap3:true,bosConfirmedByClose:true,target:'range snapshot frozen at T2',stop:'Tap 3 candle extreme',entry:'next candle open after Tap 3',dlFib:[1.35,0,-.35],minTap3Displacement:opt.minTap3Displacement??2}};}\nfunction outcome(cs,signal,maxBars=120){if(!signal||!signal.valid)return{status:'invalid',bars:0,r:0};const start=signal.entryIndex;for(let i=start;i<Math.min(cs.length,start+maxBars);i++){const c=cs[i];if(signal.side==='LONG'){const hitStop=c.low<=signal.stop,hitTarget=c.high>=signal.target;if(hitStop&&hitTarget)return{status:'ambiguous',index:i,time:c.time,bars:i-start,r:null};if(hitStop)return{status:'stop',index:i,time:c.time,bars:i-start,r:-1};if(hitTarget)return{status:'target',index:i,time:c.time,bars:i-start,r:signal.rr};}else{const hitStop=c.high>=signal.stop,hitTarget=c.low<=signal.target;if(hitStop&&hitTarget)return{status:'ambiguous',index:i,time:c.time,bars:i-start,r:null};if(hitStop)return{status:'stop',index:i,time:c.time,bars:i-start,r:-1};if(hitTarget)return{status:'target',index:i,time:c.time,bars:i-start,r:signal.rr};}}return{status:'open',bars:Math.max(0,Math.min(cs.length,start+maxBars)-start),r:0};}\nfunction backtestCausal(input,opt={}){const cs=normalizeCandles(input),warmup=Math.max(20,opt.warmup||100),events=[],seen=new Set();for(let t2=warmup;t2<cs.length-1;t2++){const setup=findFirstCausalSetup(cs,t2,opt);if(!setup||setup.taps[1].index!==t2)continue;const s=setup.signal,key=[s.entryIndex,s.side].join(':');if(seen.has(key))continue;seen.add(key);const o=outcome(cs,s,opt.maxBars||120),t1=setup.taps[0],t2c=setup.taps[1],t3=setup.tap3,range=setup.range;events.push({id:events.length+1,time:cs[s.entryIndex]?.time,setupTime:cs[s.confirmationIndex]?.time,side:s.side,entry:s.entry,stop:s.stop,target:s.target,risk:s.risk,reward:s.reward,rr:s.rr,r:o.r,t1:t1.index,t2:t2c.index,bos:setup.bos.index,t3:t3.index,confirmationIndex:s.confirmationIndex,entryIndex:s.entryIndex,rangeHigh:range.rangeHigh,rangeLow:range.rangeLow,rangeSize:range.range,trend:setup.trend,rangePctEntry:s.entry!==0?range.range/Math.abs(s.entry):null,t1ToT2:t2c.index-t1.index,t2ToBOS:setup.bos.index-t2c.index,bosToT3:t3.index-setup.bos.index,bosLevel:setup.bos.level,bosDistance:Math.abs(s.entry-setup.bos.level),outcome:o.status,outcomeIndex:o.index??null,bars:o.bars,causal:true});}\nconst closed=events.filter(e=>e.outcome==='target'||e.outcome==='stop'),wins=closed.filter(e=>e.outcome==='target'),losses=closed.filter(e=>e.outcome==='stop'),ambiguous=events.filter(e=>e.outcome==='ambiguous'),totalR=closed.reduce((a,e)=>a+e.r,0),grossWinR=wins.reduce((a,e)=>a+e.r,0),grossLossR=Math.abs(losses.reduce((a,e)=>a+e.r,0));return{ok:true,model:'GannWyck Model 1',experimental:true,causal:true,candlesCount:cs.length,events,summary:{signals:events.length,closed:closed.length,target:wins.length,stop:losses.length,open:events.filter(e=>e.outcome==='open').length,ambiguous:ambiguous.length,winRate:closed.length?wins.length/closed.length:null,totalR,avgR:closed.length?totalR/closed.length:null,avgWinR:wins.length?grossWinR/wins.length:null,avgLossR:losses.length?grossLossR/losses.length:null,expectancyR:closed.length?totalR/closed.length:null,profitFactor:grossLossR?grossWinR/grossLossR:null}};}\nfunction same(a,b){const n=(x)=>Number.isFinite(Number(x))?Number(x):null;return a.side===b.side&&a.t1===b.t1&&a.t2===b.t2&&a.bos===b.bos&&a.t3===b.t3&&a.entryIndex===b.entryIndex&&Math.abs(n(a.entry)-n(b.entry))<1e-9&&Math.abs(n(a.stop)-n(b.stop))<1e-9&&Math.abs(n(a.target)-n(b.target))<1e-9;}\nfunction lookaheadAudit(input,opt={}){const cs=normalizeCandles(input),bt=backtestCausal(cs,opt),violations=[];for(const e of bt.events){const prefix=cs.slice(0,e.entryIndex+1),replay=findFirstCausalSetup(prefix,e.t2,opt);if(!replay||!same(e,{...replay.signal,t1:replay.taps[0].index,t2:replay.taps[1].index,bos:replay.bos.index,t3:replay.tap3.index}))violations.push({eventId:e.id,t2:e.t2,entryIndex:e.entryIndex,reason:'signal_not_reproducible_using_only_candles_through_entry'});}return{ok:violations.length===0,eventsChecked:bt.events.length,violations,method:'for each event, replay is truncated at entry; no candle after entry can participate in trend/range/taps/BOS/T3/entry reconstruction'};}\nfunction backtest(input,opt={}){return backtestCausal(input,opt);}\nroot.GannWyckModel1={analyze:analyzeCausal,analyzeCausal,backtest,backtestCausal,outcome,normalizeCandles,detectTrend,findRange,calculateDL,findTaps,detectBosAfter,findTap3After,lookaheadAudit};\n})(typeof window!=='undefined'?window:globalThis);";
const sandbox = { console, globalThis: {} };
vm.createContext(sandbox);
vm.runInContext(MODEL_SOURCE, sandbox);
const M = sandbox.globalThis.GannWyckModel1;

const SYMBOL = process.env.SYMBOL || "BTCUSDT";
const LIMIT = Math.min(Number(process.env.LIMIT || 500), 1000);
const TIMEFRAMES = (process.env.TIMEFRAMES || "1h,4h,12h,1d").split(",").map(s=>s.trim()).filter(Boolean);
const PIVOT_LEN = Number(process.env.PIVOT_LEN || 5);
const MIN_BARS = Number(process.env.MIN_BARS || 12);
const MAX_BARS = Number(process.env.MAX_BARS || 300);

async function fetchKlines(interval) {
  const u = new URL("https://api.binance.com/api/v3/klines");
  u.searchParams.set("symbol", SYMBOL); u.searchParams.set("interval", interval); u.searchParams.set("limit", String(LIMIT));
  const r = await fetch(u); if (!r.ok) throw new Error("Binance HTTP "+r.status+" "+interval);
  return r.json();
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
  const linked=events.filter(e=>e.rangeLink);
  const closed=linked.filter(e=>e.outcome==="target"||e.outcome==="stop");
  const avg=(a,k)=>a.length?a.reduce((s,x)=>s+(Number(x[k])||0),0)/a.length:null;
  const byDiag={};
  for(const key of ["durationAtLeastOneDay","midpointInteraction","internalContainment","repeatedBoundaryInteraction"]){
    const yes=closed.filter(e=>e.rangeLink.diagnostics[key]), no=closed.filter(e=>!e.rangeLink.diagnostics[key]);
    byDiag[key]={yes:{n:yes.length,totalR:yes.reduce((s,e)=>s+e.r,0),avgR:avg(yes,"r")},no:{n:no.length,totalR:no.reduce((s,e)=>s+e.r,0),avgR:avg(no,"r")}};
  }
  return {tf,candles:cs.length,modelSignals:bt.summary.signals,modelClosed:bt.summary.closed,modelTotalR:bt.summary.totalR,linked:linked.length,linkedClosed:closed.length,linkedClosedR:closed.reduce((s,e)=>s+e.r,0),byDiagnostic:byDiag,events:linked};
}
(async()=>{
 const result=[];
 for(const tf of TIMEFRAMES){
   const raw=await fetchKlines(tf);
   const cs=M.normalizeCandles(raw.map(x=>({time:x[0],open:x[1],high:x[2],low:x[3],close:x[4],volume:x[5]})));
   const ranges=buildRanges(cs);
   result.push(eventForRanges(cs,ranges,tf));
 }
 console.log(JSON.stringify({version:"V0.2",symbol:SYMBOL,source:"Binance Spot REST",limit:LIMIT,pivotLen:PIVOT_LEN,minBars:MIN_BARS,maxBars:MAX_BARS,results:result},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
