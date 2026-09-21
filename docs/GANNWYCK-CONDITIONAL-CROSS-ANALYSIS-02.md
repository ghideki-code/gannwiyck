# GannWyck Conditional Cross-Analysis 02

## Objetivo

Avaliar se as features contínuas de Tap3 apresentam estrutura de desempenho por regime, sem transformá-las em filtros binários.

## Protocolo

Fonte: artefato real Binance Spot da pesquisa Model 1, execução `35552174902`, artefato `10618179483`.

Para cada timeframe:

1. somente eventos fechados;
2. ordenação cronológica por `entryIndex`;
3. 50% Train, 25% Validation, 25% OOS;
4. quartis definidos somente no Train;
5. os mesmos limites são aplicados a Validation e OOS;
6. análise adicional separada por direção;
7. nenhuma alteração no V5.6 congelado.

Features analisadas:

- `maxDirectionalImpulse`
- `stopToRange`
- `targetToRange`
- `t2ToBOS_ATR`
- `bosToT3Retracement`
- `t3DistanceToRange`
- `impulseRetention`
- `bosToT3RangeDuration`

## Resultado principal

A estratificação contínua confirma que os poucos ganhos históricos estão concentrados em amostras muito pequenas e não mostram uma separação estável entre quartis.

### 1h

15 fechados, divisão 7/3/5.

- OOS permaneceu negativo ou vazio na maioria dos quartis.
- `maxDirectionalImpulse`: Q1 OOS = -2.8825R em 4 eventos; Q2 = +0.0708R em 1 evento.
- `stopToRange`: todos os 5 eventos OOS ficaram em Q1 e somaram -2.8117R.
- `targetToRange`: todos os 5 eventos OOS ficaram em Q1 e somaram -2.8117R.
- `t3DistanceToRange`: todos os 5 eventos OOS ficaram em Q4 e somaram -2.8117R.
- Direção: LONG 9 eventos, -9R; SHORT 6 eventos, -3.8117R.

Não há separação robusta.

### 4h

15 fechados, divisão 7/3/5.

- Q1 de `maxDirectionalImpulse` no Train contém o grande evento de +31.8468R, mostrando concentração extrema de resultado.
- `targetToRange`: Q3 Train inclui +31.8468R; no OOS Q3 teve 4 eventos e -4R.
- `t3DistanceToRange`: Q1 Train contém +30.8468R; OOS Q2 teve 3 eventos e -3R.
- Direção: LONG 13 eventos, +28.95R; SHORT 2 eventos, -2R.
- LONG: Train +33.0198R, Validation +0.9302R, OOS -5R.

O resultado positivo histórico de 4h continua dependente de poucos eventos grandes e não apresenta persistência OOS.

### 12h

20 fechados, divisão 10/5/5.

- `maxDirectionalImpulse`: Train Q2 +1.9537R/evento médio; OOS Q2 -1R e Q3 -1R por evento.
- `stopToRange`: Train Q2 +3.5607R e Q3 +3.9075R, mas OOS concentrou 5 eventos em Q1 = -5R.
- `targetToRange`: Train positivo em Q1 e Q4, mas Validation e OOS permaneceram negativos.
- Direção: LONG 19 eventos, -7.5318R; SHORT 1 evento, +0.0687R.
- LONG: Train +2.4682R, Validation -5R, OOS -5R.

Nenhum regime contínuo mostrou persistência.

### 1d

15 fechados, divisão 7/3/5.

Todos os quartis relevantes permanecem negativos no Train, Validation ou OOS. O conjunto inteiro foi LONG:

- Train -7R
- Validation -3R
- OOS -5R

Não há evidência de regime contínuo útil nesta amostra.

## Dependência por Range

A tentativa de agregação por Range não pode ser aplicada ao conjunto atual porque os objetos `tap3Audit.events` usados nesta análise não carregam `rangeLink`.

Portanto, **não foi inferida independência nem feita agregação artificial**.

Isso é uma lacuna de instrumentação, não um resultado estatístico.

## Decisão

Não promover nenhuma feature contínua ao Model 1.

Também não é justificável escolher um quartil "melhor" como filtro operacional.

A pesquisa passa a ter uma conclusão mais forte:

> Até este ponto, os resultados positivos do Model 1/Tap3 aparecem como eventos ou pequenos subconjuntos históricos, sem evidência de uma regra simples de regime que sobreviva ao OOS cronológico.

## Próxima etapa

Antes de testar novos filtros, corrigir a instrumentação para preservar a identidade da Research Range em cada evento Tap3.

Depois:

1. agregação por Range;
2. split cronológico por Range, não apenas por evento;
3. R por Range;
4. número de eventos por Range;
5. concentração do resultado por Range;
6. comparação event-level vs range-level;
7. somente depois, novo teste de features contínuas.

Isso evita tratar várias entradas da mesma estrutura como observações independentes.

## Integridade

- V5.6 congelado permanece intocado.
- Nenhum filtro foi promovido.
- Nenhum resultado foi classificado como validação para dinheiro real.
- Dados sintéticos não foram usados para construir sinais.
