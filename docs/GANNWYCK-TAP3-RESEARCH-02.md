# GannWyck TAP3 Research Memo 02

Date: 2026-09-20
Status: exploratory, not model validation
Basis: real Binance Spot historical event artifact 10607276414
V5.6: unchanged

## Purpose

Test whether simple structural Tap 3 filters generalize under a chronological Train -> Validation -> OOS protocol.

This experiment uses the already generated V0.6 event population. It does not create synthetic signals and does not alter the signal-construction engine.

## Split

Events were sorted by actual event timestamp, not event ID.

For each timeframe:
- first 50%: Train
- next 25%: Validation
- final 25%: OOS

Because the samples are small, these results are diagnostic only.

A pooled analysis across the four timeframes was also performed using chronological ordering.

## Pre-registered candidate families

Only fixed candidate grids were tested:

1. BOS -> T3 elapsed bars normalized by research-Range duration:
   0.25, 0.5, 1, 2, 4
2. T3 distance to relevant Range boundary / Range size:
   2%, 5%, 10%, 20%, 40%
3. Stop distance / Range size:
   2%, 5%, 10%, 20%
4. T2 -> BOS elapsed bars:
   5, 10, 20, 40
5. BOS-distance / Range size:
   5%, 10%, 20%, 40%, 80%

The fifth feature is a normalization of the already recorded bosDistance; it is NOT a reconstruction of BOS impulse amplitude because the artifact does not preserve the full T2-to-BOS price path.

## Results

### 1h

The Train sample was already negative across the viable candidates. No candidate produced a positive Validation/OOS result.

### 4h

Training produced apparently attractive candidates, but they did not survive chronological validation.

Example:
- stop_range <= 5%
- Train: 3 events, +29.8468R
- Validation: 1 event, -1R
- OOS: 1 event, -1R

Another:
- T3 boundary <= 10%
- Train: 4 events, +28.8468R
- Validation: 3 events, +0.9302R
- OOS: 5 events, -5R

The large historical +31.8468R event materially influences the training result.

### 12h

Best Train candidate:
- T2 -> BOS <= 20 bars
- Train: 7 events, +5.5369R
- Validation: 3 events, -3R
- OOS: 3 events, -3R

The same conclusion holds for the 10-bar variant.

### 1d

Training was negative for all viable candidates tested. Validation and OOS remained negative.

## Pooled chronological result

There were 64 closed events across the four timeframes.

Split:
- Train: 32
- Validation: 16
- OOS: 16

The strongest Train candidate was:

T2 -> BOS <= 10 bars

- Train: 21 events, +28.3139R, +1.3483R/event
- Validation: 9 events, -9R
- OOS: 8 events, -6.8825R

Other strong-looking Train candidates also failed:

stop_range <= 5%
- Train: 14, +18.8468R
- Validation: 6, -6R
- OOS: 5, -3.9292R

T2 -> BOS <= 20 bars
- Train: 22, +27.3139R
- Validation: 9, -9R
- OOS: 10, -8.8825R

T3 boundary <= 20%
- Train: 27, +26.4182R
- Validation: 16, -16R
- OOS: 11, -11R

BOS-distance / Range >= 80%
- Train: 32, +22.4869R
- Validation: 16, -16R
- OOS: 16, -13.8117R

## Research conclusion

No tested simple Tap 3 threshold demonstrated chronological generalization.

The important result is therefore negative:

**Do not add a fixed Tap 3 threshold to Model 1 based on this experiment.**

The Train -> Validation failure is especially important because it shows that the apparent historical edge can disappear before OOS. The OOS deterioration reinforces that these simple thresholds are not currently reliable structural definitions.

## What remains unresolved

The current artifact does not contain enough information to calculate a true price-displacement impulse from T2 to BOS.

For the next experiment, the event record should preserve:

- T2 price/high/low/close;
- BOS candle open/high/low/close;
- Tap 3 price/high/low/close;
- maximum favorable displacement between T2 and BOS;
- maximum adverse displacement between T2 and BOS;
- signed BOS displacement;
- signed BOS -> T3 retracement;
- displacement normalized by Range;
- displacement normalized by ATR;
- time-normalized displacement;
- T3 penetration into the prior Tap 2 zone.

Those features can then be tested with the same chronological protocol.

## Integrity

- Real Binance historical data only.
- No synthetic signal data.
- No OOS parameter selection.
- No change to frozen V5.6.
- No claim of prospective validation.
- No authorization for real-money execution.
