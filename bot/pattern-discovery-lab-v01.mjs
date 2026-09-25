#!/usr/bin/env node
'use strict';
// GannWyck Pattern Discovery Lab V0.1
// RESEARCH ONLY. Real-market artifacts only. Never executes real orders.
// Synthetic fixtures, if any, are unit tests only, never research evidence.

const fs = require('node:fs');
const INPUT = process.env.INPUT_JSON || process.argv[2] || 'range-level-audit.json';
const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const ALPHA = Number(process.env.ALPHA || 0.05);

function n(v){ return Number.isFinite(Number(v)) ? Number(v) : null; }
function median(values){
  const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);
  if(!a.length) return null;
  const m=Math.floor((a.length-1)/2);
  return a.length%2?a[m]:(a[m]+a[m+1])/2;
}
function logGamma(z){
  const p=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1; let x=0.99999999999980993;
  for(let i=0;i<p.length;i++) x+=p[i]/(z+i+1);
  const t=z+p.length-0.5;
  return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
}
function logChoose(a,b){
  if(b<0||b>a) return -Infinity;
  return logGamma(a+1)-logGamma(b+1)-logGamma(a-b+1);
}
function fisherExact(a,b,c,d){
  const r1=a+b,r2=c+d,c1=a+c,total=r1+r2;
  if(!total) return null;
  const lo=Math.max(0,r1-(total-c1)), hi=Math.min(r1,c1);
  const obs=logChoose(r1,a)+logChoose(r2,c1-a)-logChoose(total,c1);
  let p=0;
  for(let x=lo;x<=hi;x++){
    const lp=logChoose(r1,x)+logChoose(r2,c1-x)-logChoose(total,c1);
    if(lp<=obs+1e-12) p+=Math.exp(lp);
  }
  return Math.min(1,p);
}
function bh(rows){
  const valid=rows.map((x,i)=>({i,p:x.p})).filter(x=>Number.isFinite(x.p)).sort((a,b)=>a.p-b.p);
  const q=Array(rows.length).fill(null); let prev=1;
  for(let j=valid.length-1;j>=0;j--){
    prev=Math.min(prev,valid[j].p*valid.length/(j+1));
    q[valid[j].i]=prev;
  }
  return q;
}
function stats(events){
  const wins=events.filter(e=>e.outcome==='target');
  const losses=events.filter(e=>e.outcome==='stop');
  const rs=events.map(e=>n(e.r)).filter(Number.isFinite);
  const totalR=rs.reduce((s,x)=>s+x,0);
  const grossWin=wins.reduce((s,e)=>s+(n(e.r)||0),0);
  const grossLoss=Math.abs(losses.reduce((s,e)=>s+(n(e.r)||0),0));
  const sorted=rs.slice().sort((a,b)=>b-a);
  function afterTop(k){
    return rs.slice().sort((a,b)=>b-a).slice(k).reduce((s,x)=>s+x,0);
  }
  return {
    n:events.length,wins:wins.length,losses:losses.length,
    winRate:events.length?wins.length/events.length:null,
    totalR:+totalR.toFixed(6),avgR:events.length?+(totalR/events.length).toFixed(6):null,
    medianR:median(rs),profitFactor:grossLoss?+(grossWin/grossLoss).toFixed(6):null,
    totalRAfterTop1:+afterTop(1).toFixed(6),totalRAfterTop3:+afterTop(3).toFixed(6)
  };
}
function splitChronological(events){
  const x=events.slice().sort((a,b)=>(n(a.entryIndex)||0)-(n(b.entryIndex)||0));
  const a=Math.floor(x.length*.5),b=Math.floor(x.length*.75);
  return {train:x.slice(0,a),validation:x.slice(a,b),oos:x.slice(b)};
}
function rrBucket(e){
  const x=n(e.rr); if(x==null)return null;
  return x<1?'0-1':x<2?'1-2':x<3?'2-3':'>=3';
}
function bosT3Bucket(e){
  const x=n(e.bosToT3); if(x==null)return null;
  return x<=5?'2-5':x<=10?'6-10':x<=20?'11-20':'>20';
}
function t1t2Bucket(e){
  const x=n(e.t1ToT2); if(x==null)return null;
  return x<=5?'0-5':x<=10?'6-10':x<=20?'11-20':'>20';
}
function t2bosBucket(e){
  const x=n(e.t2ToBos ?? e.t2ToBOS); if(x==null)return null;
  return x<=5?'0-5':x<=10?'6-10':x<=20?'11-20':'>20';
}
function t2Rejection(e){
  const x=e.t2OHLC; if(!x)return null;
  const span=n(x.high)-n(x.low); if(!(span>0))return null;
  return e.side==='LONG' ? (n(x.close)-n(x.low))/span : (n(x.high)-n(x.close))/span;
}
function climaxProxy(e){
  // Structural proxy only. Event artifact has no causal volume series.
  const rej=t2Rejection(e),t2b=n(e.t2ToBos ?? e.t2ToBOS),bt3=n(e.bosToT3);
  return rej!=null && rej>=.60 && t2b!=null && t2b<=5 && bt3!=null && bt3<=5;
}
function makeGroups(events,keyFn){
  const m=new Map();
  for(const e of events){
    const k=keyFn(e); if(k==null)continue;
    if(!m.has(k))m.set(k,[]);
    m.get(k).push(e);
  }
  return [...m.entries()].map(([key,es])=>({...stats(es),key,_ids:new Set(es.map(e=>e.id))}));
}
function fisherRows(groups,all){
  const out=groups.map(g=>{
    const rest=all.filter(e=>!g._ids.has(e.id));
    return {...g,p:fisherExact(g.wins,g.losses,rest.filter(e=>e.outcome==='target').length,rest.filter(e=>e.outcome==='stop').length)};
  });
  const q=bh(out);
  return out.map((x,i)=>({...x,q:q[i],significant:x.n>=5&&q[i]!=null&&q[i]<ALPHA}));
}
function cross3D(events){
  const rows=[];
  for(const side of ['LONG','SHORT'])for(const bt3 of ['2-5','6-10','11-20','>20'])for(const rr of ['0-1','1-2','2-3','>=3']){
    const es=events.filter(e=>e.side===side&&bosT3Bucket(e)===bt3&&rrBucket(e)===rr);
    if(!es.length)continue;
    const ids=new Set(es.map(e=>e.id)),rest=events.filter(e=>!ids.has(e.id));
    rows.push({...stats(es),side,bosToT3:bt3,rr,
      p:fisherExact(es.filter(e=>e.outcome==='target').length,es.filter(e=>e.outcome==='stop').length,
        rest.filter(e=>e.outcome==='target').length,rest.filter(e=>e.outcome==='stop').length)});
  }
  const q=bh(rows);
  return rows.map((r,i)=>({...r,q:q[i],significant:r.n>=5&&q[i]!=null&&q[i]<ALPHA}));
}
function section(events){
  const closed=events.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const dir=makeGroups(closed,e=>e.side);
  const rr=makeGroups(closed,rrBucket);
  const t1t2=makeGroups(closed,t1t2Bucket);
  const t2bos=makeGroups(closed,t2bosBucket);
  const bt3=makeGroups(closed,bosT3Bucket);
  const climax=makeGroups(closed,e=>climaxProxy(e)?(e.side==='LONG'?'LONG_SC_PROXY':'SHORT_BC_PROXY'):'OTHER');
  return {
    baseline:stats(closed),
    direction:fisherRows(dir,closed).map(({_ids,...x})=>x),
    rr:fisherRows(rr,closed).map(({_ids,...x})=>x),
    t1ToT2:fisherRows(t1t2,closed).map(({_ids,...x})=>x),
    t2ToBOS:fisherRows(t2bos,closed).map(({_ids,...x})=>x),
    bosToT3:fisherRows(bt3,closed).map(({_ids,...x})=>x),
    cross3D:cross3D(closed),
    climaxProxy:fisherRows(climax,closed).map(({_ids,...x})=>x),
    climaxDefinition:{
      name:'structural_climax_proxy',
      long:'T2 rejection >= 0.60 + T2->BOS <= 5 + BOS->T3 <= 5',
      shortMirror:'same geometry interpreted as buying-climax-like',
      volumeConfirmed:false,
      note:'Not a Wyckoff Selling Climax confirmation because the causal event artifact does not include volume history.'
    }
  };
}
function analyzeTF(block){
  const events=(block.tap3Audit?.events||block.events||[]).filter(e=>e.outcome==='target'||e.outcome==='stop');
  const full=section(events),split=splitChronological(events),chronological={};
  for(const [k,v] of Object.entries(split))chronological[k]=section(v);
  return {timeframe:block.tf||null,events:events.length,fullSample:full,chronological};
}
const report={
  version:'V0.1',generatedAt:new Date().toISOString(),input:INPUT,
  methodology:{
    realMarketEvidenceRequired:true,discoveryValidationOOS:'50/25/25 chronological',
    multipleTesting:'Benjamini-Hochberg q-values across subgroup Fisher tests',
    fisherAlpha:ALPHA,outlierStress:'top-1/top-3 R removal',
    realExecution:false,frozenV56Touched:false,
    syntheticSignalData:false
  },
  results:(data.results||[]).map(analyzeTF)
};
console.log(JSON.stringify(report,null,2));
