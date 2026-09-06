/* GannWyck MTF Scanner. Uses the current experimental Model 1 engine independently per timeframe. */
(function(root){'use strict';
function scan(candlesByTf,options){
  const tfs=options?.timeframes||Object.keys(candlesByTf||{}), rows=[];
  for(const tf of tfs){
    const cs=candlesByTf[tf]||[];
    const r=root.GannWyckModel1.analyze(cs,options||{});
    rows.push({timeframe:tf,ok:r.ok,trend:r.trend||'unknown',range:r.range||null,taps:r.taps||[],bos:r.bos||null,signal:r.signal||null,extremeZone:r.extremeZone||null,score:score(r)});
  }
  const bullish=rows.filter(x=>x.trend==='up').length, bearish=rows.filter(x=>x.trend==='down').length;
  const confirmed=rows.filter(x=>x.signal?.valid).length;
  let bias='NEUTRAL'; if(bullish>bearish&&bullish>=2)bias='BULLISH'; if(bearish>bullish&&bearish>=2)bias='BEARISH';
  return {model:'GannWyck MTF Scanner',experimental:true,timeframes:tfs,bias,confidence:tfs.length?Math.round((Math.max(bullish,bearish)/tfs.length)*100):0,confirmedSetups:confirmed,rows,confluence:buildConfluence(rows)};
}
function score(r){let s=0;if(r.trend==='up'||r.trend==='down')s+=20;if(r.taps?.length>=2)s+=20;if(r.bos)s+=25;if(r.taps?.length>=3)s+=15;if(r.signal?.valid)s+=20;return s;}
function buildConfluence(rows){const valid=rows.filter(x=>x.signal?.valid);if(!valid.length)return null;const sides=valid.reduce((a,x)=>{a[x.signal.side]=(a[x.signal.side]||0)+1;return a},{});const side=Object.entries(sides).sort((a,b)=>b[1]-a[1])[0];return{side:side[0],timeframes:valid.filter(x=>x.signal.side===side[0]).map(x=>x.timeframe),count:side[1]};}
root.GannWyckMTF={scan};
})(typeof window!=='undefined'?window:globalThis);