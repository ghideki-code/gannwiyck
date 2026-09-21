# GannWyck TAP3 Research Memo 01

Date: 2026-09-20
Status: exploratory research only
Source artifact: V0.6 corrected range-cycle research, GitHub Actions artifact 10607276414
Source data: Binance Spot, BTCUSDT
Frozen V5.6: untouched

## Objective

Measure the current engineering Tap 3 sequence without changing V5.6:

T2 -> BOS -> Tap 3 -> next-open entry

The diagnostic records elapsed bars, stop distance relative to range, Tap 3 distance to the range boundary, outcome R, and concentration by research Range.

## Data actually measured

| TF | Signals | Closed | Total R | Avg T2->BOS | Avg BOS->T3 |
|---|---:|---:|---:|---:|---:|
| 1h | 15 | 14 | -11.8117 | 111.429 | 413.500 |
| 4h | 18 | 15 | +26.9500 | 171.533 | 875.400 |
| 12h | 21 | 20 | -7.4631 | 57.800 | 449.200 |
| 1d | 15 | 15 | -15.0000 | 28.467 | 303.067 |

These are historical research diagnostics, not prospective validation.

## Main observation: the current 2-bar Tap 3 minimum is not descriptive of observed elapsed time

The measured BOS->T3 elapsed time is much larger than two bars on average in every tested timeframe.

The grouped results reinforce this:

- 1h: 9/14 closed events had BOS->T3 >20 bars and all 9 were losses. The 5 events in the 2-5 bar group produced -2.8117R.
- 4h: 13/15 closed events had BOS->T3 >20 bars and produced +28.9500R. The 2 events in the 2-5 group produced -2R.
- 12h: 18/20 closed events had BOS->T3 >20 bars and produced -6.5318R.
- 1d: all 15 closed events had BOS->T3 >20 bars and all were losses.

This does NOT justify selecting a new displacement threshold. The sample is small, timeframe-dependent, and the 4h result is heavily influenced by a single +31.8468R event.

## Important outlier

The largest 4h historical event was:

- event 8
- LONG
- +31.84675R
- T2->BOS: 3 bars
- BOS->T3: 823 bars

This means a simple rule such as "Tap 3 must occur quickly after BOS" would have removed a major historical winner in this sample.

Therefore, elapsed-bar filtering must not be chosen from the same OOS-like sample used to judge performance.

## T2 -> BOS

The current groups do not show a stable monotonic relationship:

- 1h: 0-5 = -3.8825R; >20 = -4.9292R
- 4h: 0-5 = +25.8468R, driven largely by the +31.8468R event; >20 = -0.8270R
- 12h: 0-5 = -4.0238R; >20 = -7R
- 1d: 0-5 = -10R; >20 = -4R

No threshold should be promoted from this evidence.

## Stop distance relative to Range

Average stop/range ratio:

- 1h: 8.7021%
- 4h: 8.8283%
- 12h: 15.2515%
- 1d: 3.9058%

The group results are unstable and heavily sample-dependent. This feature is better treated as a normalization variable for future modeling than as a fixed filter at this stage.

## Tap 3 distance to Range

The diagnostic currently measures the distance of the Tap 3 close from the relevant range boundary, normalized by range size.

Observed groups are inconsistent across timeframes. For example:

- 1h: <=10% produced 0/8 wins and -8R.
- 4h: <=10% contained 12 events, 2 wins and +24.7770R total, but includes the large 31.8468R winner.
- 12h: <=10% produced 0/11 wins and -11R; 10-25% produced +4.4682R.
- 1d: all 15 events were <=10% and all lost.

This is a hypothesis generator, not a validated filter.

## Range dependence

Multiple Model 1 events can belong to the same research Range, so event count is not automatically independent sample size.

| TF | Research ranges | Events | Multi-event ranges | Event/Range |
|---|---:|---:|---:|---:|
| 1h | 12 | 15 | 2 | 1.25 |
| 4h | 12 | 18 | 4 | 1.50 |
| 12h | 16 | 21 | 4 | 1.31 |
| 1d | 10 | 15 | 3 | 1.50 |

The existing artifact explicitly labels this as diagnostic only. It does not establish whether multiple entries per Range are methodologically valid.

## Research decision

Do NOT add a fixed Tap 3 elapsed-bar filter to Model 1.

The next isolated experiment should instead define Tap 3 using continuous structural features, with the threshold chosen only on chronological training data:

1. displacement in price normalized by Range size;
2. BOS->T3 elapsed bars normalized by timeframe or Range duration;
3. impulse amplitude between BOS and T3;
4. T3 distance to the relevant range boundary;
5. interaction with the prior Tap 2 zone;
6. MFE/MAE measured only through outcome.

The experiment must preserve the original event population and compare candidate feature families on train/validation before any OOS evaluation.

## Integrity

- No synthetic signal data used.
- V5.6 frozen source was not changed.
- This memo does not alter Model 1.
- Historical results do not constitute prospective validation.
- Real-money execution remains unauthorized.
