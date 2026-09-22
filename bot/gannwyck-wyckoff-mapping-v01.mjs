#!/usr/bin/env node
/**
 * GannWyck Wyckoff Mapping Research 01
 * Research-only. Never modifies the frozen V5.6 source.
 *
 * Input: range-level-audit.json produced by range-model1-crossanalysis-v01.mjs
 * Output: JSON to stdout.
 */
'use strict';
const fs = require('fs');

const input = process.argv[2] || 'range-level-audit.json';
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const TIMEFRAMES = ['1h','4h','12h','1d'];

function num(v){ return Number.isFinite(Number(v)) ? Number(v) : null; }
function median(a){
  const x=a.filter(v=>Number.isFinite(v)).sort((a,b)=>a-b);
  if(!x.length)return null;
  const m=Math.floor(x.length/2);
  return x.length%2 ? x[m] : (x[m-1]+x[m])/2;
}
function q(a,p){
  const x=a.filter(v=>Number.isFinite(v)).sort((a,b)=>a-b);
  if(!x.length)return null;
  const i=(x.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i);
  return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(i-lo);
}
function summarize(events){
  const c=events.filter(e=>e.outcome==='target'||e.outcome==='stop');
  const wins=c.filter(e=>e.outcome==='target');
  return {
    n:c.length,
    totalR:c.reduce((s,e)=>s+num(e.r),0),
    avgR:c.length?c.reduce((s,e)=>s+num(e.r),0)/c.length:0,
    wins:wins.length,
    winRate:c.length?wins.length/c.length:null
  };
}
function getEvents(tf){
  const block = (data.results || []).find(x=>x.tf===tf) || {};
  const raw = block.events || block.closedEvents || [];
  return raw.filter(e=>e.outcome==='target'||e.outcome==='stop').map(e=>{
    const range=num(e.rangeSize);
    const t2bos=num(e.t2ToBOS);
    const bosT3=num(e.bosToT3);
    const impulse=num(e.maxDirectionalImpulse);
    const retr=num(e.bosToT3Retracement);
    const pen=num(e.t3PenetrationTowardT2);
    const ret=num(e.impulseRetention);
    const bosAtr=num(e.maxImpulse_ATR);
    const t2Atr=num(e.t2ToBOS_ATR);
    const signed=num(e.signedT2ToBOS);
    const t2Rej = Number.isFinite(signed) && Number.isFinite(impulse) ? Math.max(0, impulse-signed) : null;
    return {...e,
      _t2bos:t2bos,_bosT3:bosT3,_impulse:impulse,_retr:retr,_pen:pen,_ret:ret,
      _bosAtr:bosAtr,_t2Atr:t2Atr,_signed:signed,_t2Rej:t2Rej,
      _impulseRange: range&&impulse!=null ? impulse/range : null
    };
  }).sort((a,b)=>(num(a.entryIndex)??0)-(num(b.entryIndex)??0));
}
function evalCandidate(events, pred){
  return summarize(events.filter(pred));
}
function runTF(tf){
  const ev=getEvents(tf);
  if(ev.length<8)return {timeframe:tf,n:ev.length,eligible:false,reason:'too_few_closed_events'};
  const n=ev.length;
  const a=Math.floor(n*0.5), b=Math.floor(n*0.75);
  const train=ev.slice(0,a), val=ev.slice(a,b), oos=ev.slice(b);
  const metrics=['_t2Rej','_t2bos','_impulseRange','_ret','_pen'];
  const med={}; for(const m of metrics) med[m]=median(train.map(e=>num(e[m])));

  const candidates={
    C1_ST_LIKE: e=>num(e._t2Rej)>=med._t2Rej && num(e._t2bos)<=med._t2bos,
    C2_BOS_CONFIRM: e=>num(e._impulseRange)>=med._impulseRange && num(e._t2bos)<=med._t2bos,
    C3_LPS_LPSY: e=>num(e._ret)>=med._ret && num(e._pen)<=med._pen,
    C4_ST_PLUS_RETENTION: e=>num(e._t2Rej)>=med._t2Rej && num(e._ret)>=med._ret
  };

  const out={timeframe:tf,n,eligible:true,splits:{train:train.length,validation:val.length,oos:oos.length},trainMedians:med,baseline:{train:summarize(train),validation:summarize(val),oos:summarize(oos)},candidates:{}};
  for(const [name,pred] of Object.entries(candidates)){
    out.candidates[name]={
      train:evalCandidate(train,pred),
      validation:evalCandidate(val,pred),
      oos:evalCandidate(oos,pred)
    };
  }
  return out;
}

const output={
  experiment:'GannWyck Wyckoff Mapping Research 01',
  generatedAt:new Date().toISOString(),
  methodology:{
    realMarketResearch:true,
    source:'range-level-audit.json',
    split:'chronological 50/25/25',
    oosThresholdTuning:false,
    interpretation:'Tap2=ST-like; BOS=SOS/SOW-like; Tap3=LPS/LPSY-like are hypotheses only'
  },
  timeframes:Object.fromEntries(TIMEFRAMES.map(tf=>[tf,runTF(tf)]))
};
console.log(JSON.stringify(output,null,2));
