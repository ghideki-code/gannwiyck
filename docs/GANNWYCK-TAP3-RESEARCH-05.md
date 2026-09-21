# GannWyck TAP3 Research Memo 05

Date: 2026-09-21
Artifact analyzed: gannwyck-range-cycle-33
Workflow run: 35552174902
Research commit: e3b5803c9d0bf00deb45866a7e59c46734337436

## Objective

Test the four pre-registered, small multivariate Tap 3 candidate families using the newly captured causal structural geometry.

No large parameter search was performed.

## Protocol

For each timeframe independently:

- sort closed events by actual entry chronology;
- first 50% = Train;
- next 25% = Validation;
- final 25% = OOS;
- calculate the threshold for each feature from Train only;
- threshold is the Train median;
- apply the frozen threshold unchanged to Validation and OOS.

Candidate definitions:

1. maximum directional impulse >= Train median AND BOS->T3 retracement <= Train median;
2. maximum directional impulse >= Train median AND T3 penetration toward T2 <= Train median;
3. maximum impulse / ATR >= Train median AND BOS->T3 retracement / ATR <= Train median;
4. impulse retention >= Train median AND T3 penetration toward T2 <= Train median.

This is an exploratory chronological diagnostic. It is not a validation gate.

## Results

### 1h

Closed events: 15
Split: Train 7 / Validation 3 / OOS 5

- impulse + retracement: Train 2 / -2R; Validation 0 / 0R; OOS 0 / 0R
- impulse + penetration: Train 2 / -2R; Validation 0 / 0R; OOS 0 / 0R
- ATR impulse + ATR retracement: Train 2 / -2R; Validation 1 / -1R; OOS 2 / -0.9292R
- retention + penetration: Train 2 / -2R; Validation 0 / 0R; OOS 0 / 0R

No candidate shows positive OOS R.

### 4h

Closed events: 15
Split: Train 7 / Validation 3 / OOS 5

- impulse + retracement: Train 3 / -3R; Validation 0 / 0R; OOS 0 / 0R
- impulse + penetration: Train 2 / -2R; Validation 1 / +2.9302R; OOS 1 / -1R
- ATR impulse + ATR retracement: Train 3 / -3R; Validation 1 / +2.9302R; OOS 0 / 0R
- retention + penetration: Train 2 / -2R; Validation 1 / +2.9302R; OOS 1 / -1R

The large historical 4h winner appears in Validation for some candidates, but the same frozen candidates do not retain positive OOS R.

### 12h

Closed events: 20
Split: Train 10 / Validation 5 / OOS 5

- impulse + retracement: Train 3 / +3.6294R; Validation 2 / -2R; OOS 3 / -3R
- impulse + penetration: Train 2 / -2R; Validation 1 / -1R; OOS 0 / 0R
- ATR impulse + ATR retracement: Train 3 / +3.6294R; Validation 2 / -2R; OOS 1 / -1R
- retention + penetration: Train 2 / -2R; Validation 1 / -1R; OOS 0 / 0R

The candidates that look positive in Train do not remain positive in OOS.

### 1d

Closed events: 15
Split: Train 7 / Validation 3 / OOS 5

- impulse + retracement: Train 1 / -1R; Validation 1 / -1R; OOS 0 / 0R
- impulse + penetration: Train 2 / -2R; Validation 0 / 0R; OOS 1 / -1R
- ATR impulse + ATR retracement: Train 3 / -3R; Validation 0 / 0R; OOS 0 / 0R
- retention + penetration: Train 2 / -2R; Validation 0 / 0R; OOS 1 / -1R

No candidate shows positive OOS R.

## Decision

The four pre-registered multivariate combinations do not provide evidence for promotion into Model 1.

The important result is not that the combinations lose. It is that the few historical positive separations do not persist through the chronological sequence:

**Train -> Validation -> OOS**

Therefore:

- no Tap 3 geometry filter is added to V5.6;
- no threshold is promoted;
- no candidate is declared validated;
- no prospective claim is made.

## Data quality note

The analysis used the newly regenerated real Binance Spot event mechanics. Structural OHLC fields are therefore available directly from the candle series rather than inferred from R outcomes.

## Next research direction

Tap 3 geometry should now be treated as a descriptive feature set unless a future experiment produces chronological generalization.

The next useful isolated test is not a larger feature grid. It should test whether the geometry has information conditional on the existing Model 1 state, especially:

- side;
- trend state;
- range width;
- stop/range;
- range objective distance;
- and Tap 2 to BOS displacement.

Any such conditioning must be pre-registered and evaluated chronologically.

## Integrity

- Real Binance Spot data only.
- No synthetic signals.
- No lookahead.
- No OOS tuning.
- V5.6 frozen source unchanged.
- Research result is not a real-money validation.
