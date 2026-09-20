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

function validate(rows) {
  const c = rows.map(r => ({ t:+r[0], h:+r[2], l:+r[3], close:+r[4] }));
  let lastPH = null, lastPL = null, active = null;
  const historical = [];
  let candidateChanges = 0, invalidated = 0, activeBars = 0, midTouches = 0;

  for (let i = 0; i < c.length; i++) {
    const confirmedIndex = i - PIVOT_LEN;
    if (confirmedIndex >= 0) {
      const H = pivotAt(c, confirmedIndex, "H");
      const L = pivotAt(c, confirmedIndex, "L");
      if (H !== null) lastPH = { i: confirmedIndex, v:H };
      if (L !== null) lastPL = { i: confirmedIndex, v:L };
    }

    if (lastPH && lastPL) {
      const start = Math.min(lastPH.i, lastPL.i);
      const end = Math.max(lastPH.i, lastPL.i);
      const bars = end - start;
      const size = lastPH.v - lastPL.v;
      const structural = size > 0 && bars >= MIN_BARS && bars <= MAX_BARS;

      const replacementAllowed = !active || active.state === "INVALIDADO";
      const changed = !active ||
        lastPH.v !== active.high ||
        lastPL.v !== active.low ||
        lastPH.i !== active.highBar ||
        lastPL.i !== active.lowBar;

      if (structural && replacementAllowed && changed) {
        if (active) historical.push(active);
        active = {
          high:lastPH.v, low:lastPL.v,
          highBar:lastPH.i, lowBar:lastPL.i,
          start, state:"EM FORMAÇÃO",
          touches:0, lastTouch:-999, invalidation:null
        };
        candidateChanges++;
      }
    }

    if (!active || active.state === "INVALIDADO") continue;

    const mid = active.low + (active.high - active.low) * 0.5;
    if (c[i].l <= mid && c[i].h >= mid && i > active.lastTouch + 1) {
      active.touches++;
      active.lastTouch = i;
      midTouches++;
    }

    const duration = i - active.start;
    const durationOK = duration >= MIN_BARS && duration <= MAX_BARS;
    const midpointOK = active.touches >= MIN_MID_TOUCHES;
    active.state = durationOK && midpointOK ? "ATIVO" : "EM FORMAÇÃO";

    if (c[i].close > active.high) {
      active.state = "INVALIDADO";
      active.invalidation = "ROMPIMENTO DO HIGH";
      active.invalidationBar = i;
      invalidated++;
    } else if (c[i].close < active.low) {
      active.state = "INVALIDADO";
      active.invalidation = "ROMPIMENTO DO LOW";
      active.invalidationBar = i;
      invalidated++;
    }

    if (active.state === "ATIVO") activeBars++;
  }

  return {
    bars:c.length,
    candidateChanges,
    invalidated,
    historical:historical.length,
    activeBars,
    activeShare:+(activeBars / c.length).toFixed(4),
    midpointTouches:midTouches,
    finalState:active?.state ?? "SEM RANGE",
    finalRange:active ? {
      high:active.high,
      low:active.low,
      highBar:active.highBar,
      lowBar:active.lowBar,
      start:active.start,
      touches:active.touches,
      invalidation:active.invalidation ?? null
    } : null
  };
}

const out = {};
for (const interval of intervals) {
  const rows = await fetchKlines(interval);
  out[interval] = validate(rows);
}

console.log(JSON.stringify({
  source:"Binance Spot REST /api/v3/klines",
  symbol:SYMBOL,
  limit:LIMIT,
  pivotLen:PIVOT_LEN,
  minBars:MIN_BARS,
  maxBars:MAX_BARS,
  minMidTouches:MIN_MID_TOUCHES,
  results:out
}, null, 2));
