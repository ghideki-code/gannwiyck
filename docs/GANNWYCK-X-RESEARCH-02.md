# GannWyck X Research Memo 02

Date: 2026-09-20
Purpose: extend X research with current public observations. This memo is research evidence, not validation.

## New observations

### 1. Gann time is presented as a confluence layer
A current public post describes BTC HTF as:
- 180 Gann Day + Model 1 at the last clean swing high
- 360 Gann Day + Model 1 at the last clean swing low
- price revisiting the cited low

The same account separately published an update describing price still sitting on the 360 Gann Day + Model 1 low.

This supports testing Gann-time alignment as a feature attached to already-confirmed structural pivots, rather than using Gann time as a standalone entry trigger.

### 2. 270 Gann Day also appears in the public material
A reproduced public post states that a BTC bottom could be indicated by 270 Gann Day and 145 Gann Day, while Wyckoff still required additional price action.

This prevents hard-coding only 180/360 before testing the broader family of observed intervals.

### 3. HTF/MTF cross-asset confirmation
A recent ETH post describes ETH, ETH.D and ETH/BTC all printing Model 1 Accumulation and refers to weekly ETH structure, ETH dominance and ETH/BTC demand together.

Research implication: cross-asset alignment should be represented as context, with no lookahead, and tested separately from the core Model 1 signal.

### 4. Range objective remains explicit
Recent BTC posts pair Model 1 Distribution with the statement that the range low remains open. Another post describes BTC MTF with the range low still open.

Research implication: create a causal range-objective-open state and test whether it improves target selection or signal filtering.

### 5. Tap sequencing is directional and staged
The public PEPE post states:
1st Tap confirmed -> 2nd Tap in the making -> 3rd Tap after the push up.

Research implication: Tap 3 should be modeled as a post-impulse structural event. The current research minimum of two candles is therefore only an engineering constraint, not a claimed canonical GannWyck rule.

### 6. Separate numerology from the quantitative model
Current public material explicitly labels BTC 2026-2040 forecasts as numerology and separately discusses TA versus numerology.

Research rule: numerology is excluded from quantitative Model 1 research unless a separate, explicitly labeled hypothesis is created.

## Experimental design

Do not modify frozen V5.6.

Create isolated research variants:

A. GW-X-GANN-TIME
Features: 145, 180, 270, 360 day distances from confirmed pivots.
Question: does time-cycle confluence improve forward expectancy or robustness?

B. GW-X-HTF-MTF
Features: higher-timeframe Model 1 state and agreement/disagreement.
Question: does HTF state filter lower-timeframe false positives?

C. GW-X-RANGE-OBJECTIVE
Feature: causal open/closed range-boundary objective.
Question: does an open target state improve target hit rate without increasing adverse excursion?

D. GW-X-TAP3
Features: post-Tap2 impulse magnitude, displacement, and elapsed bars.
Question: does structural separation outperform the current minimum-bar heuristic?

## Validation requirements

- Real Binance data only.
- No synthetic data in signal construction.
- Chronological train/validation/OOS.
- No parameter selection on OOS.
- Costs expressed explicitly.
- Report event count, total R, median R, hit rate, MFE, MAE, drawdown, bootstrap distribution, and second-half performance.
- Apply multiple-testing correction or an explicit holdout policy across tested feature families.
- Keep V5.6 frozen and untouched.
