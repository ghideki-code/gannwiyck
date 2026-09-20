const SYMBOL = process.env.SYMBOL || "BTCUSDT";
const LIMIT = Number(process.env.LIMIT || 500);
const PIVOT_LEN = Number(process.env.PIVOT_LEN || 5);
const MIN_BARS = Number(process.env.MIN_BARS || 12);
const MAX_BARS = Number(process.env.MAX_BARS || 300);
const MIN_MID_TOUCHES = Number(process.env.MIN_MID_TOUCHES || 1);
const intervals = (process.env.TIMEFRAMES || "1h,4h,12h,1d").split(",").map(s => s.trim()).filter(Boolean);

async function fetchKlines(interval) {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", SYMBOL);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(Math.min(LIMIT, 1000)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance HTTP ${res.status} for ${interval}`);
  return await res.json();
}

function pivotAt(c, i, type) {
  if (i < PIVOT_LEN || i >= c.length - PIVOT_LEN) return null;
  const v = type === "H" ? c[i].h : c[i].l;
  for (let j = 1; j <= PIVOT_LEN; j++) {
    if (type === "H") {
      if (v <= c[i-j].h || v < c[i+j].h) return null;
    } else {
      if (v >= c[i-j].l || v > c[i+j].l) return null;
    }
  }
  return v;
}

function finalize(a, endIndex, c) {
  if (!a) return;
  const end = a.invalidationBar ?? endIndex;
  a.end = end;
  a.duration = end - a.start;
  a.widthPct = a.low !== 0 ? (a.high - a.low) / Math.abs(a.low) * 100 : null;
  a.midTouches = a.touches;
  a.boundaryTouches = a.boundaryTouches;
  a.internalShare = a.duration > 0 ? a.internalBars / a.duration : 0;
  a.maxMidExcursion = a.maxMidExcursion;
  a.breakoutDirection = a.invalidation === "ROMPIMENTO DO HIGH" ? "UP" : a.invalidation === "ROMPIMENTO DO LOW" ? "DOWN" : null;
}

function analyze(rows) {
  const c = rows.map(r => ({t:+r[0],h:+r[2],l:+r[3],close:+r[4]}));
  let lastPH = null, lastPL = null, active = null;
  const ranges = [];
  let candidates = 0, invalidated = 0;

  for (let i=0; i<c.length; i++) {
    const k = i - PIVOT_LEN;
    if (k >= 0) {
      const H = pivotAt(c,k,"H"), L = pivotAt(c,k,"L");
      if (H !== null) lastPH = {i:k,v:H};
      if (L !== null) lastPL = {i:k,v:L};
    }

    if (lastPH && lastPL) {
      const start = Math.min(lastPH.i,lastPL.i);
      const end = Math.max(lastPH.i,lastPL.i);
      const bars = end-start;
      const size = lastPH.v-lastPL.v;
      const structural = size > 0 && bars >= MIN_BARS && bars <= MAX_BARS;
      const replacementAllowed = !active || active.state === "INVALIDADO";
      const changed = !active || lastPH.v !== active.high || lastPL.v !== active.low ||
        lastPH.i !== active.highBar || lastPL.i !== active.lowBar;

      if (structural && replacementAllowed && changed) {
        if (active) { finalize(active,i-1,c); ranges.push(active); }
        active = {
          id:candidates+1, high:lastPH.v, low:lastPL.v,
          highBar:lastPH.i, lowBar:lastPL.i, start,
          direction:lastPL.i < lastPH.i ? "LOW → HIGH" : "HIGH → LOW",
          state:"EM FORMAÇÃO", touches:0, lastTouch:-999,
          boundaryTouches:0, internalBars:0, maxMidExcursion:0,
          invalidation:null, invalidationBar:null
        };
        candidates++;
      }
    }

    if (!active || active.state === "INVALIDADO") continue;

    const size = active.high-active.low;
    const mid = active.low + size*0.5;
    if (c[i].l <= mid && c[i].h >= mid && i > active.lastTouch+1) {
      active.touches++;
      active.lastTouch=i;
    }
    if (c[i].h >= active.high || c[i].l <= active.low) active.boundaryTouches++;
    if (c[i].h < active.high && c[i].l > active.low) active.internalBars++;
    if (size > 0) active.maxMidExcursion = Math.max(
      active.maxMidExcursion,
      Math.max(Math.abs(c[i].h-mid),Math.abs(c[i].l-mid))/size
    );

    const duration=i-active.start;
    active.state = duration >= MIN_BARS && duration <= MAX_BARS && active.touches >= MIN_MID_TOUCHES ? "ATIVO" : "EM FORMAÇÃO";

    if (c[i].close > active.high) {
      active.state="INVALIDADO"; active.invalidation="ROMPIMENTO DO HIGH"; active.invalidationBar=i; invalidated++;
      finalize(active,i,c); ranges.push(active); active=null;
    } else if (c[i].close < active.low) {
      active.state="INVALIDADO"; active.invalidation="ROMPIMENTO DO LOW"; active.invalidationBar=i; invalidated++;
      finalize(active,i,c); ranges.push(active); active=null;
    }
  }

  if (active) { finalize(active,c.length-1,c); ranges.push(active); }

  const closed = ranges.filter(r => r.invalidationBar !== null);
  const active = ranges.filter(r => r.state === "ATIVO");
  const durations = ranges.map(r=>r.duration).filter(Number.isFinite);
  const widthPcts = ranges.map(r=>r.widthPct).filter(Number.isFinite);
  const internalShares = ranges.map(r=>r.internalShare).filter(Number.isFinite);

  const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const median = a => {
    if (!a.length) return null;
    const s=[...a].sort((x,y)=>x-y), m=Math.floor(s.length/2);
    return s.length%2?s[m]:(s[m-1]+s[m])/2;
  };

  return {
    bars:c.length, candidates, invalidated, ranges:ranges.length,
    closed:ranges.filter(r=>r.invalidationBar!==null).length,
    active:active.length,
    avgDuration:avg(durations), medianDuration:median(durations),
    avgWidthPct:avg(widthPcts), medianWidthPct:median(widthPcts),
    avgInternalShare:avg(internalShares),
    totalMidTouches:ranges.reduce((s,r)=>s+r.midTouches,0),
    ranges:ranges.map(r=>({
      id:r.id,direction:r.direction,start:r.start,end:r.end,duration:r.duration,
      high:r.high,low:r.low,widthPct:+(r.widthPct??0).toFixed(3),
      midTouches:r.midTouches,boundaryTouches:r.boundaryTouches,
      internalShare:+(r.internalShare??0).toFixed(3),
      maxMidExcursion:+(r.maxMidExcursion??0).toFixed(3),
      state:r.state,invalidation:r.invalidation
    }))
  };
}

const out={};
for(const interval of intervals) out[interval]=analyze(await fetchKlines(interval));
function classifyRange(r) {
  const durationDays = r.duration * ({ "1h":1/24, "4h":4/24, "12h":12/24, "1d":1 }[r.interval] || 0);
  const midpointDensity = r.duration > 0 ? r.midTouches / r.duration : 0;
  const boundaryDensity = r.duration > 0 ? r.boundaryTouches / r.duration : 0;
  const internalShare = r.internalShare ?? 0;
  const observations = {
    durationAtLeastOneDay: durationDays >= 1,
    midpointInteraction: r.midTouches >= 1,
    internalContainment: internalShare >= 0.40,
    repeatedBoundaryInteraction: r.boundaryTouches >= 3,
    notUltraNarrow: r.widthPct >= 0.50
  };
  const count = Object.values(observations).filter(Boolean).length;
  return { durationDays:+durationDays.toFixed(2), midpointDensity:+midpointDensity.toFixed(3), boundaryDensity:+boundaryDensity.toFixed(3), observations, satisfied:count, total:Object.keys(observations).length };
}
for (const [interval, result] of Object.entries(out)) {
  result.ranges = result.ranges.map(r => ({...r, interval, diagnostics:classifyRange({...r, interval})}));
}
console.log(JSON.stringify({version:"V0.5",source:"Binance Spot REST /api/v3/klines",symbol:SYMBOL,limit:LIMIT,pivotLen:PIVOT_LEN,minBars:MIN_BARS,maxBars:MAX_BARS,minMidTouches:MIN_MID_TOUCHES,results:out},null,2));
