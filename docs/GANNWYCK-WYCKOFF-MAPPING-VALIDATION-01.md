# GannWyck Wyckoff Mapping Research 01 — Validation Result

## Validation source

Artifact: `gannwyck-range-cycle-33.zip`
Run: `35552174902`
Artifact: `10618179483`
Source data: real Binance Spot research.

The experiment uses chronological Train 50% / Validation 25% / OOS 25% per timeframe.

A methodology correction was made before final validation: `maxDirectionalImpulse` is already normalized by Range in the source artifact, so the Wyckoff mapping engine was corrected to avoid double normalization.

## Results

| TF | Closed | Candidate | Train R | Val R | OOS R | OOS n |
|---|---:|---|---:|---:|---:|---:|
| 1h | 15 | C1 ST-like | -2.00 | -1.00 | +0.1175 | 1 |
| 1h | 15 | C2 BOS | -2.00 | 0.00 | 0.00 | 0 |
| 1h | 15 | C3 LPS/LPSY | -2.00 | 0.00 | 0.00 | 0 |
| 1h | 15 | C4 ST+retention | -2.00 | -2.00 | -0.8825 | 2 |
| 4h | 15 | C1 ST-like | -2.00 | 0.00 | 0.00 | 0 |
| 4h | 15 | C2 BOS | -4.00 | 0.00 | -1.00 | 1 |
| 4h | 15 | C3 LPS/LPSY | -2.00 | +2.9302 | -1.00 | 1 |
| 4h | 15 | C4 ST+retention | -2.00 | +2.9302 | 0.00 | 0 |
| 12h | 20 | C1 ST-like | -3.00 | -1.00 | 0.00 | 0 |
| 12h | 20 | C2 BOS | +0.0687 | -1.00 | -2.00 | 2 |
| 12h | 20 | C3 LPS/LPSY | -2.00 | -1.00 | 0.00 | 0 |
| 12h | 20 | C4 ST+retention | +3.5607 | -2.00 | 0.00 | 0 |
| 1d | 15 | C1 ST-like | -2.00 | -1.00 | -3.00 | 3 |
| 1d | 15 | C2 BOS | -4.00 | 0.00 | -1.00 | 1 |
| 1d | 15 | C3 LPS/LPSY | -2.00 | 0.00 | -1.00 | 1 |
| 1d | 15 | C4 ST+retention | -2.00 | -1.00 | -1.00 | 1 |

## Decision

No candidate is validated.

In particular:

- Tap 2 = Secondary-Test-like is **not statistically validated** by this experiment.
- BOS = SOS/SOW-like is **not validated**.
- Tap 3 = LPS/LPSY-like is **not validated**.
- No Wyckoff filter is promoted to Model 1.
- No V5.6 source is modified.
- The positive 1h C1 result (+0.1175R) has only one OOS event and is not evidence of generalization.
- The 4h C3/C4 Validation gains disappear in OOS.
- 12h C2/C4 Train positives do not survive Validation/OOS.
- 1d remains negative.

## Interpretation

The experiment does **not** prove that the visual Wyckoff analogy is wrong. It shows that the current simple quantitative definitions are insufficient to establish the analogy as a predictive filter.

The next useful research step is not to tune these thresholds further. It is to improve the event definition itself, especially whether Tap 2 contains measurable evidence of a genuine test/rejection and whether BOS/Tap 3 represent a causal effort-result transition.

Research only. No real execution.
