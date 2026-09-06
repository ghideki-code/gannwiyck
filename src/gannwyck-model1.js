/*
 * GannWyck Model 1
 * Experimental, rule-based implementation.
 * No repainting: signals are evaluated only from candles already closed.
 */
(function (root) {
  'use strict';

  const EPS = 1e-12;

  function finite(v) { return Number.isFinite(Number(v)); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function normalizeCandles(candles) {
    return (candles || []).map((c, i) => ({
      index: i,
      time: c.time ?? c.timestamp ?? i,
      open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
      volume: finite(c.volume) ? Number(c.volume) : null
    })).filter(c => [c.open,c.high,c.low,c.close].every(finite));
  }

  function detectTrend(candles, lookback = 20) {
    if (candles.length < 3) return 'unknown';
    const n = Math.min(lookback, candles.length - 1);
    const a = candles[candles.length - 1 - n].close;
    const b = candles[candles.length - 1].close;
    if (b > a * 1.002) return 'up';
    if (b < a * 0.998) return 'down';
    return 'range';
  }

  function findRange(candles, trend, lookback = 80) {
    const start = Math.max(0, candles.length - lookback);
    const slice = candles.slice(start);
    if (!slice.length) return null;
    let hi = slice[0], lo = slice[0];
    for (const c of slice) {
      if (c.high > hi.high) hi = c;
      if (c.low < lo.low) lo = c;
    }
    const rangeHigh = hi.high;
    const rangeLow = lo.low;
    const range = rangeHigh - rangeLow;
    if (!(range > EPS)) return null;
    return {
      trend,
      rangeHigh, rangeLow, range,
      highIndex: hi.index, lowIndex: lo.index,
      midpoint: rangeLow + range * 0.5
    };
  }

  function calculateDL(range) {
    const R = range.range;
    return {
      upper: range.rangeLow + R * 1.35,
      zero: range.rangeLow,
      lower: range.rangeLow - R * 0.35,
      upperFromHigh: range.rangeHigh + R * 0.35
    };
  }

  function inDL(price, dl) {
    return price <= dl.upper + EPS && price >= dl.lower - EPS;
  }

  function findTaps(candles, dl, trend) {
    const taps = [];
    for (const c of candles) {
      const candidate = trend === 'up' ? c.low : c.high;
      if (!inDL(candidate, dl)) continue;
      const direction = trend === 'up' ? 'demand' : 'supply';
      taps.push({ index:c.index, time:c.time, price:candidate, type:direction, high:c.high, low:c.low, close:c.close });
    }
    if (!taps.length) return [];

    const first = taps[0];
    const second = taps.slice(1).reduce((best, t) => {
      if (!best) return t;
      return trend === 'up' ? (t.price < best.price ? t : best) : (t.price > best.price ? t : best);
    }, null);
    const selected = [first];
    if (second && second.index !== first.index) selected.push(second);

    // Tap 3 must occur after Tap 2 and is kept distinct in time.
    if (selected.length === 2) {
      const t2 = selected[1];
      const t3 = taps.find(t => t.index > t2.index && t.index - t2.index >= 2);
      if (t3) selected.push(t3);
    }
    return selected;
  }

  function detectBOS(candles, tap2, trend) {
    if (!tap2) return null;
    const start = tap2.index + 1;
    if (start >= candles.length) return null;
    if (trend === 'up') {
      let priorHigh = -Infinity;
      for (let i = 0; i < start; i++) priorHigh = Math.max(priorHigh, candles[i].high);
      for (let i = start; i < candles.length; i++) {
        const c = candles[i];
        if (c.close > priorHigh + EPS) return { index:i, type:'bullish', level:priorHigh, close:c.close };
      }
    } else if (trend === 'down') {
      let priorLow = Infinity;
      for (let i = 0; i < start; i++) priorLow = Math.min(priorLow, candles[i].low);
      for (let i = start; i < candles.length; i++) {
        const c = candles[i];
        if (c.close < priorLow - EPS) return { index:i, type:'bearish', level:priorLow, close:c.close };
      }
    }
    return null;
  }

  function buildSignal(candles, range, dl, taps, bos, trend) {
    if (!range || taps.length < 3 || !bos) return null;
    const t3 = taps[2];
    const bullish = trend === 'up';
    const entry = candles[bos.index].close;
    const stop = bullish ? t3.price : t3.price;
    const target = bullish ? range.rangeHigh : range.rangeLow;
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    return {
      side: bullish ? 'LONG' : 'SHORT',
      entry, stop, target,
      risk, reward,
      rr: risk > EPS ? reward / risk : null,
      confirmationIndex: bos.index,
      tap3Index: t3.index,
      valid: risk > EPS && reward > EPS
    };
  }

  function analyze(input, options = {}) {
    const candles = normalizeCandles(input);
    const lookback = options.lookback || 80;
    const trend = options.trend || detectTrend(candles, options.trendLookback || 20);
    const range = findRange(candles, trend, lookback);
    if (!range) return { ok:false, reason:'range_not_found', candlesCount:candles.length };
    const dl = calculateDL(range);
    const taps = findTaps(candles, dl, trend);
    const tap2 = taps[1] || null;
    const bos = detectBOS(candles, tap2, trend);
    const signal = buildSignal(candles, range, dl, taps, bos, trend);
    return {
      ok:true,
      model:'GannWyck Model 1',
      experimental:true,
      trend, range, dl, taps, bos, signal,
      extremeZone: tap2 ? { type: trend === 'up' ? 'Extreme Demand' : 'Extreme Supply', price:tap2.price, index:tap2.index } : null,
      rules: {
        tapsRequired:3,
        bosBeforeTap3:true,
        bosConfirmedByClose:true,
        target:trend === 'down' ? 'Range Low' : 'Range High',
        stop:'Tap 3',
        dlFib:[1.35,0,-0.35]
      }
    };
  }

  root.GannWyckModel1 = { analyze, normalizeCandles, detectTrend, findRange, calculateDL, findTaps, detectBOS };
})(typeof window !== 'undefined' ? window : globalThis);
