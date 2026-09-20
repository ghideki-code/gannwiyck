# GannWyck CONTEXT

Generated: 2026-09-20
Purpose: restart the GannWyck project in a new chat without losing the current state.

## Restart command

Use:
"Continue o GannWyck a partir do CONTEXT.md. Leia todo o contexto antes de alterar qualquer coisa. Preserve o V5.6 congelado e continue de onde o projeto parou."

## Project

- Repository: ghideki-code/gannwiyck
- Branch: main
- Vercel: https://gannwiyck-tayh.vercel.app
- Public site: https://gannwyck.com/
- Focus: quantitative research and validation of GannWyck Model 1.
- Initial market: BTCUSDT. Research also covers HTF/MTF and other assets.
- Mode: analysis and paper trading only.
- Never execute real orders.

## Non-negotiable methodology

- Real market data only for signal construction and validation.
- No synthetic signal data.
- Backtests/simulations may be used only as simulations, never as real-market evidence.
- Keep discovery, training, validation and OOS separated.
- Never modify the frozen V5.6 source or freeze timestamp.
- Never call a model validated for real money before prospective gates pass.
- Never claim a gate passed without checking the actual run/artifact.
- Never treat an X post or a YouTube example as statistical proof.

## Model 1 sequence

Tendência -> Range -> DL -> Tap 1 -> Tap 2 -> BOS -> Tap 3 -> confirmação -> entrada/gestão.

Current engine hypotheses:
- Trend: current close versus 20 bars back, threshold ±0.2%.
- Range: max high/min low over last 80 bars.
- DL: Fib 1.35, 0, -0.35. Current engineering hypothesis uses Range Low as zero:
  upper = RangeLow + 1.35*Range
  zero = RangeLow
  lower = RangeLow - 0.35*Range
  upperFromHigh = RangeHigh + 0.35*Range.
- Tap 1 starts sequence.
- Tap 2 is the relevant extreme inside DL.
- BOS requires full candle close beyond relevant structural level after T2.
- Tap 3 is found after BOS with current engineering minimum displacement of 2 candles.
- Signal uses next candle open after T3, stop at T3 extreme and target at opposite range boundary.
- Causal engine snapshots information through T2 and searches BOS/T3 without lookahead.

Unresolved:
- definitive DL anchors;
- definitive range/trend algorithms;
- mitigation;
- quantitative FVG and Supply/Demand;
- timeframe/duration filters;
- formal T3 quality;
- partial management.

## V5.6 frozen prospective holdout

Workflow: .github/workflows/v56-prospective-holdout.yml
Freeze: 2026-09-20T00:15:00Z
Timeframes: 1h, 4h, 12h, 1d
MAX_CANDLES=50000
MAX_BARS=120
WARMUP=100
BOOTSTRAPS=5000

Frozen model blob:
9ef385bbc7e86db24fe1c9bca87c3e6b536df714

Frozen research stats blob:
16721ac77d21af9a6f19ec8003a707b6f2cd3d92

Frozen source:
src/gannwyck-model1-frozen-v56.js

Gates:
1. closed >= 30
2. totalR > 0
3. totalR after top-3 removal > 0
4. block-bootstrap P05 > 0
5. second half >= 15 closed and totalR > 0
6. >=4/5 folds positive with >=3 events
7. all pass

Latest known run:
35530652315, job 106130528176, artifact 10611043155.
Workflow succeeded but had zero closed prospective events on 1h/4h/12h/1d, so statistical gates were not evaluable. This is not a performance failure.

Integrity fix:
- Previous run 35529076941 failed because src/gannwyck-model1.js had changed after freeze.
- Exact frozen copy was created from blob 9ef385...
- Commit 9d60e2f482e31ec3543d0beec805db65a28cd771 fixed the holdout to load/hash the immutable frozen copy.
- Do not change this source for research.

## Historical results

V5.5:
- run 35477676406
- artifact 10594668002
- 1h: 52 closed, +67.92R; top3 removal -29.49R; bootstrap P05 -28.85R; second half +79.45R.
- 4h: 52 closed, +65.08R; top3 removal -45.07R; bootstrap P05 -44.14R; second half +15.95R.
- 12h and 1d negative.
- Bootstrap P05 is a quantile, not a p-value.
- No multiple-testing correction.
- Top-k removal is robustness stress, not an execution model.
- Costs were expressed in R units.

V0.6 corrected:
- run 35516846121
- artifact 10607276414
- 1h: 15 signals, 14 closed, -11.811708900638687R
- 4h: 18 signals, 15 closed, +26.94999597488368R
- 12h: 21 signals, 20 closed, -7.463095005636803R
- 1d: 15 signals, 15 closed, -15R
- one-event-per-range: 1h -9.882493R; 4h -2.896754R; 12h -9.023793R; 1d -10R.
- 4h aggregate was heavily influenced by a few large winners, including about +31.85R.

## MFE/MAE

V0.7 corrected the excursion audit:
- entryIndex and outcomeIndex are preserved in eventMechanics.
- excursion window stops at outcomeIndex+1 to prevent post-outcome contamination.
- bins: <=0, 0-0.5R, 0.5-1R, 1-2R, >2R.
- time-to-excursion: 0-2, 3-10, 11-30, >30.
- Uses full OHLC of outcome candle, so it is a bar-level diagnostic, not tick-level path reconstruction.

## HTF research

Workflow: .github/workflows/range-cycle-research-htf.yml
Timeframes: 2d, 3d, 5d, 1w, 1M.
Real Binance Spot data.
Research range detection uses future pivot confirmation, so it is not a canonical causal signal.
2d/5d are derived from daily epoch-day buckets and may not be calendar-aligned.
Native intervals include 1h, 4h, 12h, 1d, 3d, 1w, 1M.
Monthly data was confirmed as real Binance monthly candles. Current endTime handling uses a 30-day approximation and should be treated cautiously if methodology is revised.

## X research

Docs:
- docs/GANNWYCK-X-RESEARCH-01.md, commit f65e3fc27ae1c582aca078d948a197815895822c
- docs/GANNWYCK-X-RESEARCH-02.md, commit f0454c6b6a83cb07691faa4aa0a5eadcc3123d1b

Observed public material:
- staged Tap sequence: Tap 1 confirmed, Tap 2 forming, Tap 3 after the push;
- BTC Model 1 Distribution paired with unresolved Range Low;
- HTF/MTF context;
- Gann time references around 180 and 360 Gann Day;
- additional references to 270 and 145 Gann Day;
- ETH + ETH.D + ETH/BTC contextual confirmation;
- technical analysis is distinguished from numerology.

Hypotheses:
- T3 may require meaningful temporal/price displacement from T2.
- Range boundary can be a causal target-state variable.
- HTF Model 1 can be tested as a lower-timeframe filter.
- Gann time can be tested as an independent feature.
- Cross-asset confirmation can be tested as context.

Do not hard-code these from anecdotal posts.

## PEPE 6R video research

User-provided video:
"How I Played a 6R Long on PEPE ( GW MODEL 1 ).mp4", approx 6m19s.

Research doc:
docs/GANNWYCK-VIDEO-PEPE-6R-RESEARCH.md
Commit 7e081cf6539a7f5b383a8da45cc90d053073d63e

Visible observations:
- PEPE/USDT perpetual on TradingView.
- Visible "Gann Wyck Model 1 Accumulation" label.
- Prior descending structure and descending red trendline.
- Lower green demand zone.
- Recovery from lower structural area.
- Multiple horizontal levels around execution area.
- Broader and more detailed timeframe/context views.
- Worked example presented as a 6R long.

Research implications:
- Accumulation appears structural, not a simple indicator crossover.
- Execution is refined around a structural/demand area.
- Internal levels may matter.
- HTF context plus LTF execution should be researched.

Limitations:
- Exact spoken Tap/BOS/DL/entry/stop/Gann rules were not established from frames alone.
- It is a worked example, not a statistical sample.
- Do not modify V5.6 based on this video.

## Architecture

Agent chain:
Technical, SMC, Wyckoff/Gann, Divergences.

Each agent returns:
decision LONG/SHORT/NEUTRO, confidence 0-100, thesis, keyLevels[], invalidation, riskFlags[].

Consensus:
4/4 = 100%; 3/4 = 75%; fewer than 3 valid = DATA_INSUFFICIENT and Master Score 0.

Master Score:
0-39 SEM TRADE
40-49 SETUP FRACO
50-59 SETUP MODERADO
60-69 SETUP BOM
70-84 SETUP FORTE
85-100 SETUP EXTREMO

Risk Engine initial config:
equity 1000 USDT; risk 0.5%; max position 25%; max positions 3.

Setup Engine fields:
symbol, direction, entry, stopLoss, tp1, tp2, tp3, riskReward, positionSize, notional, confidence, masterScore, consensus, quality, setupType, tradeLogic, invalidation, riskFlags.

Typical gates:
Master Score >=50; consensus >=60%; R/R >=1.5; at least 3 valid agents. Any failed gate blocks trade.

## Important commits

9d60e2f... frozen-source fix
656037a... exact frozen copy
c7705e6... MFE/MAE event indices
087a66c... accelerated HTF
84e37f3... extended HTF
965af73... HTF matrix
ef51c99... latest completed causal setup
8748bb1... causal diagnostics
4c01f2f... causal audit
8026d59... causal freezing/lookahead
bc77d20... causal backtest/lookahead
b50161d... browser test API correction
f65e3fc... X research 01
f0454c6... X research 02
7e081cf... PEPE video research

## Current phase

Prospective V5.6 holdout is running from the freeze timestamp while research continues in isolated documents/branches/files.

Next actions:
1. Inspect new V5.6 runs and artifacts.
2. When closed events accumulate, report exact gates.
3. Verify HTF MFE/MAE after the index correction.
4. Build isolated research variants for Gann time, HTF/MTF, range objective, and T3 displacement.
5. Use chronological train/validation/OOS and multiple-testing controls.
6. Keep V5.6 immutable.
7. Never authorize real-money execution from current evidence.

## Safety/status

Real-money validation: NOT COMPLETE.
Real orders: NEVER.
Synthetic signal data: NOT ALLOWED.
Historical positive results do not equal prospective validation.
