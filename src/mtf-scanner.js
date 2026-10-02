/* GannWyck MTF Scanner. Uses the experimental Model 1 engine independently per timeframe. */
(function(root){'use strict';
function finite(v){return Number.isFinite(Number(v));}
function dataQuality(cs,r){
  const total=cs.length;
  if(!total)return {score:0,validBars:0,totalBars:0};
  const validBars=cs.filter(c=>c&&[c.open,c.high,c.low,c.close].every(finite)).length;
  const score=Math.round((validBars/total)*100);
  return {score,validBars,totalBars:total};
}
function riskFlags(r,q){
  const flags=[];
  if(q.score<100)flags.push('DADOS_INCOMPLETOS');
  if(r.trend==='unknown')flags.push('SEM_TENDENCIA_CONFIRMADA');
  if(!r.range)flags.push('SEM_RANGE_CONFIRMADO');
  if(!r.bos)flags.push('SEM_BOS_CONFIRMADO');
  if(!r.signal?.valid)flags.push('SEM_SETUP_VALIDO');
  return flags;
}
function score(r,q){
  if(q.score<100)return 0;
  let s=0;
  if(r.trend==='up'||r.trend==='down')s+=20;
  if(r.taps?.length>=2)s+=20;
  if(r.bos)s+=25;
  if(r.taps?.length>=3)s+=15;
  if(r.signal?.valid)s+=20;
  return Math.max(0,Math.min(100,s));
}
function scan(candlesByTf,options){
  const tfs=options?.timeframes||Object.keys(candlesByTf||{}), rows=[];
  for(const tf of tfs){
    const cs=candlesByTf[tf]||[];
    const r=root.GannWyckModel1.analyze(cs,options||{});
    const quality=dataQuality(cs,r), evidenceScore=score(r,quality), flags=riskFlags(r,quality);
    rows.push({timeframe:tf,ok:r.ok,trend:r.trend||'unknown',range:r.range||null,taps:r.taps||[],bos:r.bos||null,signal:r.signal||null,extremeZone:r.extremeZone||null,score:evidenceScore,dataQualityScore:quality.score,evidenceScore,riskFlags:flags,candleCount:cs.length});
  }
  const bullish=rows.filter(x=>x.trend==='up'&&x.dataQualityScore===100).length, bearish=rows.filter(x=>x.trend==='down'&&x.dataQualityScore===100).length;
  const confirmed=rows.filter(x=>x.signal?.valid&&x.dataQualityScore===100).length;
  let bias='NEUTRAL'; if(bullish>bearish&&bullish>=2)bias='BULLISH'; if(bearish>bullish&&bearish>=2)bias='BEARISH';
  const directionalCount=Math.max(bullish,bearish), confidence=tfs.length?Math.round((directionalCount/tfs.length)*100):0;
  return {model:'GannWyck MTF Scanner',experimental:true,timeframes:tfs,bias,confidence,confirmedSetups:confirmed,rows,confluence:buildConfluence(rows)};
}
function buildConfluence(rows){const valid=rows.filter(x=>x.signal?.valid&&x.dataQualityScore===100);if(!valid.length)return null;const sides=valid.reduce((a,x)=>{a[x.signal.side]=(a[x.signal.side]||0)+1;return a},{});const side=Object.entries(sides).sort((a,b)=>b[1]-a[1])[0];return{side:side[0],timeframes:valid.filter(x=>x.signal.side===side[0]).map(x=>x.timeframe),count:side[1],validTimeframes:valid.length};}
root.GannWyckMTF={scan,dataQuality};
})(typeof window!=='undefined'?window:globalThis);