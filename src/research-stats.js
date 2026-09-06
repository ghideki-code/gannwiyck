/* GannWyck Model 1 research statistics. Experimental. */
(function(root){'use strict';
function finite(v){return Number.isFinite(Number(v));}
function pct(v){return finite(v)?Number(v):null;}
function rMultiple(e){if(!e||!finite(e.entry)||!finite(e.stop)||!finite(e.target))return null;const risk=Math.abs(e.entry-e.stop);if(!(risk>0))return null;return (e.side==='LONG'?e.target-e.entry:e.entry-e.target)/risk;}
function featureRow(e, candles){
  const t1=Number.isFinite(e.tap1)?e.tap1:null,t2=Number.isFinite(e.tap2)?e.tap2:null,t3=Number.isFinite(e.tap3)?e.tap3:null,bos=Number.isFinite(e.bos)?e.bos:null;
  const c=candles?.[e.confirmationIndex];
  return { ...e, confirmationIndex:e.confirmationIndex??e.bos??null, timestamp:e.time??c?.time??null,
    tap12Bars:t1!==null&&t2!==null?t2-t1:null, tap23Bars:t2!==null&&t3!==null?t3-t2:null,
    tap2BosBars:t2!==null&&bos!==null?bos-t2:null, bosTap3Bars:bos!==null&&t3!==null?t3-bos:null,
    realizedR:e.outcome==='target'?rMultiple(e):e.outcome==='stop'?-1:null,
    normalizedRisk:finite(e.entry)&&finite(e.stop)&&finite(e.entry)&&e.entry!==0?Math.abs(e.entry-e.stop)/Math.abs(e.entry):null,
    confirmationClose:c?.close??null };
}
function group(rows,keyFn){const m=new Map();for(const r of rows){const k=keyFn(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return m;}
function aggregate(rows){const closed=rows.filter(r=>r.outcome==='target'||r.outcome==='stop'),wins=closed.filter(r=>r.outcome==='target'),losses=closed.filter(r=>r.outcome==='stop');const rs=closed.map(r=>r.realizedR).filter(finite);return{samples:rows.length,closed:closed.length,wins:wins.length,losses:losses.length,open:rows.length-closed.length,winRate:closed.length?wins.length/closed.length:null,avgR:rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:null,medianR:rs.length?[...rs].sort((a,b)=>a-b)[Math.floor(rs.length/2)]:null};}
function discover(input,opt={}){const base=input?.events||input?.rows||[];const candles=input?.candles||[];const rows=base.map(e=>featureRow(e,candles));const bySide=[...group(rows,r=>r.side)].map(([key,v])=>({group:key,...aggregate(v)}));const byOutcome=aggregate(rows);const spacingBuckets=opt.spacingBuckets||[0,2,4,8,12,20,40];function bucket(v){if(!finite(v))return'unknown';for(let i=1;i<spacingBuckets.length;i++)if(v<=spacingBuckets[i])return `${spacingBuckets[i-1]}-${spacingBuckets[i]}`;return `${spacingBuckets.at(-1)}+`;}
 const byTapSpacing=[...group(rows,r=>bucket(r.tap23Bars))].map(([key,v])=>({tap23:key,...aggregate(v)})).sort((a,b)=>(a.tap23||'').localeCompare(b.tap23||'',undefined,{numeric:true}));
 const byRR=[...group(rows,r=>!finite(r.rr)?'unknown':r.rr<1?'0-1':r.rr<2?'1-2':r.rr<3?'2-3':'3+')].map(([key,v])=>({rrBucket:key,...aggregate(v)}));
 return{ok:true,experimental:true,model:'GannWyck Model 1',rows,summary:byOutcome,bySide,byTapSpacing,byRR};}
function fromBacktests(results){const rows=[];for(const x of results||[]){for(const e of x?.events||[])rows.push({...e,time:e.time,symbol:x.symbol??null,timeframe:x.timeframe??null});}return discover({rows});}
root.GannWyckResearchStats={discover,fromBacktests,aggregate,featureRow};
})(typeof window!=='undefined'?window:globalThis);