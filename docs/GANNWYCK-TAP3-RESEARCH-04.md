# GannWyck TAP3 Research Memo 04

Date: 2026-09-21
Artifact: gannwyck-range-cycle-33
Workflow run: 35552174902
Research commit: e3b5803c9d0bf00deb45866a7e59c46734337436

## Objective

Evaluate continuous causal Tap 3 geometry after the previous chronological experiment found no generalization from fixed Tap 3 elapsed-time or structural thresholds.

The run regenerated event mechanics from real Binance Spot candles and preserved T2, BOS and T3 OHLC.

## Newly recorded features

For every closed event:

- T2 OHLC
- BOS OHLC and broken structural level
- T3 OHLC
- signed T2 -> BOS displacement / Range
- maximum directional impulse / Range
- BOS -> T3 retracement / Range
- T3 penetration toward T2 / Range
- impulse retention
- ATR at BOS
- T2 -> BOS / ATR
- maximum impulse / ATR
- BOS -> T3 retracement / ATR
- BOS -> T3 / research-Range duration

ATR uses only candles through BOS.

## Current real-data result

The run produced:

- 1h: 15 closed, total -12.8117R
- 4h: 15 closed, total +26.9500R
- 12h: 20 closed, total -7.4631R
- 1d: 15 closed, total -15R

Additional HTF observations are too sparse for model selection:
- 2d: 2 closed
- 3d: 3 closed
- 5d, 1w, 1M: 0 closed

The 4h result remains dominated by the previously identified large historical winner. The new geometry fields do not remove the need for chronological validation.

## Chronological exploratory check

A fixed, non-OOS-tuned diagnostic was applied conceptually as follows:

- events sorted by entry chronology;
- first 50% Train;
- next 25% Validation;
- final 25% OOS;
- threshold for each feature taken only from the Train median;
- the same threshold then applied unchanged to Validation and OOS.

This is an exploratory diagnostic, not a model-selection result.

### 1h

No feature produced positive OOS aggregate R for the median split. The timeframe is already negative in Train/Validation/OOS for most tested partitions.

### 4h

The apparent Train signal is strongly affected by the large historical winner.

Examples:
- signed T2 -> BOS: Train 34.02R vs -3R on the opposite side; Validation -1R/+0.93R; OOS -2R/-2R.
- maximum impulse: Train 34.02R vs -3R; Validation -3R/+2.93R; OOS -3R/-1R.
- BOS -> T3 retracement: Train +29.847R in the upper side, but Validation +0.93R and OOS -1R for that same side.
- BOS -> T3 / Range duration: Train +29.847R on the upper side, Validation +0.93R, OOS -4R.

The large Train contribution therefore does not survive unchanged into OOS.

### 12h

Median splits show mixed Train behavior but no persistent positive OOS side. For example:
- signed displacement: Train +0.907R/+1.629R, Validation -2R/-3R, OOS -1R/-4R.
- maximum impulse: same Train pattern, then negative Validation and OOS.
- BOS -> T3 retracement: Train +1.629R/+0.907R, Validation -4R/-1R, OOS -3R/-2R.

### 1d

All closed events are losses in the current run. Feature splits therefore cannot establish discrimination.

## Interpretation

The experiment successfully solved the measurement problem: the event record now contains the structural OHLC and normalized geometry required for a more faithful Tap 3 analysis.

It did not produce evidence that any single continuous feature should be promoted into Model 1.

The recurring pattern is important:

**historical separation can appear inside a timeframe, but the separation is not stable across chronological Validation and OOS.**

The 4h case is especially sensitive to the known large winner.

## Next isolated experiment

Do not add a Tap 3 filter yet.

Next step:

1. freeze the feature extraction code;
2. pre-register a small set of multivariate combinations;
3. use Train only to define combinations;
4. Validation decides whether a combination survives;
5. OOS remains untouched until the candidate is frozen;
6. evaluate range clustering and top-event concentration;
7. only candidates surviving chronology can proceed to a separate prospective test.

Candidate families should remain simple and interpretable:

- impulse strength + retracement;
- impulse strength + T3 penetration;
- ATR-normalized impulse + ATR-normalized retracement;
- impulse retention + T3 penetration.

No large grid search should be used.

## Integrity

- Real Binance Spot data only.
- No synthetic signal data.
- No lookahead.
- Research artifact is historical/diagnostic evidence, not prospective validation.
- V5.6 frozen source and freeze timestamp remain untouched.
- No real-money execution is authorized.
