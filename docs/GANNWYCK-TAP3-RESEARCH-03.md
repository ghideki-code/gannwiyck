# GannWyck TAP3 Research Memo 03

Date: 2026-09-20
Status: specification for next isolated experiment
V5.6: untouched

## Purpose

The previous chronological experiment showed that fixed Tap 3 thresholds do not generalize. The next experiment therefore moves from threshold selection to continuous structural measurements.

## Required event extension

The research event record must preserve the OHLC of the structural candles needed to reconstruct the movement.

### T2
- open
- high
- low
- close
- index/time

### BOS
- open
- high
- low
- close
- index/time
- structural level broken

### Tap 3
- open
- high
- low
- close
- index/time

No future candle may participate in constructing any of these fields.

## Derived features

### 1. Signed T2 to BOS displacement

For LONG:
(BOS.close - T2.close) / RangeSize

For SHORT:
(T2.close - BOS.close) / RangeSize

### 2. Maximum directional impulse

For LONG:
maximum (high_i - T2.close) / RangeSize between T2 and BOS inclusive.

For SHORT:
maximum (T2.close - low_i) / RangeSize.

This distinguishes a strong impulse from a merely late close.

### 3. BOS to T3 retracement

For LONG:
(BOS.close - T3.close) / RangeSize

For SHORT:
(T3.close - BOS.close) / RangeSize

This is signed retracement magnitude, not a future outcome measure.

### 4. T3 penetration toward T2

Measure the T3 extreme relative to the T2 extreme and RangeSize.

Store it as a signed normalized quantity so LONG and SHORT have the same orientation.

### 5. Impulse retention

1 - absolute(BOS to T3 retracement) / absolute(max directional impulse)

This is diagnostic only and is not a validated rule.

### 6. ATR normalization

Compute ATR using only candles available through BOS.

Store:
- T2 to BOS displacement / ATR;
- maximum impulse / ATR;
- BOS to T3 retracement / ATR.

ATR must never use candles after BOS for this feature.

### 7. Range-duration normalization

Store:
BOS to T3 bars / research Range duration

This is a descriptive feature, not a proposed cutoff.

## Research protocol

The feature extraction itself must be frozen before outcome analysis.

Then:

1. chronological Train;
2. Validation;
3. untouched OOS;
4. report distributions before selecting thresholds;
5. test only pre-registered feature transformations;
6. use bootstrap confidence intervals as descriptive robustness diagnostics;
7. do not optimize thresholds on OOS.

## Critical limitation

The existing V0.6 artifact contains T2, BOS, T3, entry and outcome indices plus BOS level and Range size, but it does not preserve all OHLC structural-candle fields needed for the full impulse reconstruction.

Therefore the next run must regenerate the event mechanics from real Binance Spot candles.

It is invalid to infer missing OHLC from the stored R result.

## Expected output

For every timeframe:

- event count;
- closed count;
- feature distributions;
- Train/Validation/OOS partitions;
- feature vs R descriptive tables;
- MFE/MAE by feature quantile;
- drawdown;
- bootstrap distribution;
- top-event concentration;
- range-dependence audit.

## Decision rule

No feature becomes part of Model 1 merely because it correlates with historical R.

Promotion requires chronological validation and then a separate prospective test. V5.6 remains the untouched baseline.

## Integrity

- Real Binance data only.
- No synthetic signals.
- No lookahead.
- V5.6 immutable.
- Research variant only.
