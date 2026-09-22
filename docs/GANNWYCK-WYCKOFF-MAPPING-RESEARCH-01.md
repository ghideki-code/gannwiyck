# GannWyck Wyckoff Mapping Research 01

## Objective

Test, without modifying the frozen V5.6 Model 1, whether the current GannWyck event sequence has measurable properties consistent with the following **hypothesis**:

- Tap 1 = first structural test
- Tap 2 = Secondary-Test-like event
- BOS = Sign-of-Strength/Sign-of-Weakness-like confirmation
- Tap 3 = LPS/LPSY-like post-break retest

These are mappings for research, not equivalences or canonical Wyckoff labels.

## Source-derived GannWyck sequence

Current Model 1 sequence:

Trend -> Range -> Tap 1 -> Tap 2 -> BOS -> Tap 3 -> entry.

Tap 2 is the second relevant structural extreme inside the model's DL. BOS requires a close beyond the pre-T2 structural level. Tap 3 occurs after BOS and the entry is the next candle open.

## Quantitative hypotheses

### H1: Tap 2 test/rejection

For each closed event, measure:

- T1 -> T2 elapsed bars
- T2 -> BOS elapsed bars
- signed T2 -> BOS displacement normalized by Range
- T2 penetration toward the prior structural side
- T2 candle rejection proxy
- volume ratio T2 / median recent volume when volume is available

A candidate ST-like T2 should show a measurable rejection/failed continuation before BOS rather than merely being a repeated touch.

### H2: BOS confirmation

Measure:

- BOS displacement / Range
- BOS displacement / ATR
- BOS close beyond structural level
- time T2 -> BOS

The experiment does not assume a threshold in advance. Thresholds are learned only from Train and evaluated on Validation/OOS.

### H3: Tap 3 post-break test

Measure:

- BOS -> T3 elapsed bars
- T3 penetration toward T2
- BOS -> T3 retracement
- impulse retention
- T3 distance to range boundary

A candidate LPS/LPSY-like T3 should preserve enough of the post-BOS impulse while remaining a bounded retest.

## Split

For each timeframe independently:

- first 50% Train
- next 25% Validation
- final 25% OOS

No OOS threshold selection.

## Candidate families

Pre-register only four small families:

1. T2 rejection >= Train median AND T2->BOS <= Train median
2. BOS impulse >= Train median AND T2->BOS <= Train median
3. impulse retention >= Train median AND T3 penetration <= Train median
4. T2 rejection >= Train median AND impulse retention >= Train median

The medians are computed from Train only.

## Important limitation

The current range research uses research-range links that may rely on future pivot confirmation. Therefore this experiment is **diagnostic research**, not canonical causal Model 1 evidence.

No candidate is promoted from this experiment automatically.

## Decision rule

A candidate is only considered interesting if it improves chronological OOS relative to ALL for the same split and has non-trivial OOS sample size. No claim of validation is made from a single positive result.

## V5.6 integrity

The frozen V5.6 source is not modified by this experiment.
