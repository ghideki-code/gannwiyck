export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const symbol = String(q.symbol || "BTCUSDT").toUpperCase();
    const interval = String(q.interval || "1h");
    const limit = Math.min(1000, Math.max(1, Number(q.limit || 1000)));
    const endTime = q.endTime ? Number(q.endTime) : null;
    const allowed = new Set(["1h","4h","12h","1d"]);
    if (!allowed.has(interval)) return res.status(400).json({ error: "Invalid interval" });
    if (!/^[A-Z0-9]{5,20}$/.test(symbol)) return res.status(400).json({ error: "Invalid symbol" });

    const url = new URL("https://data-api.binance.vision/api/v3/klines");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));
    if (Number.isFinite(endTime)) url.searchParams.set("endTime", String(endTime));

    const r = await fetch(url, { headers: { "accept": "application/json" } });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
