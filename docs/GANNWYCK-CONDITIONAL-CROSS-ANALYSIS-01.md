# GannWyck Conditional Cross-Analysis 01

## Objetivo

Testar, de forma isolada e sem alterar o V5.6 congelado, se a geometria do Tap3 ganha poder discriminativo quando condicionada por características estruturais já observadas no evento Model 1:

- impulso máximo T2→BOS;
- stop/range;
- distância do objetivo/range;
- tempo T2→BOS;
- distância do Tap3 ao limite relevante da Range.

## Protocolo

- Fonte: artefato de pesquisa real Binance Spot `10618179483`, execução `35552174902`.
- Eventos apenas fechados.
- Ordem cronológica por `entryIndex`.
- Separação por timeframe: primeiros 50% Train, próximos 25% Validation, últimos 25% OOS.
- Cada limiar foi definido exclusivamente pela mediana do Train daquele timeframe.
- O mesmo limiar foi mantido em Validation e OOS.
- Quatro combinações pré-especificadas, sem busca combinatória:
  1. maxDirectionalImpulse >= mediana AND stop/range <= mediana
  2. maxDirectionalImpulse >= mediana AND target/range >= mediana
  3. T2→BOS <= mediana AND stop/range <= mediana
  4. maxDirectionalImpulse >= mediana AND T3-distance-to-range <= mediana
- Nenhuma alteração em `src/gannwyck-model1-frozen-v56.js`.

## Resultados

### 1h

15 eventos fechados, divisão 7/4/4.

| Candidato | Train | Validation | OOS |
|---|---:|---:|---:|
| Impulso + stop/range | 2 / -2R | 1 / -1R | 0 / 0R |
| Impulso + target/range | 3 / -3R | 1 / -1R | 0 / 0R |
| T2→BOS + stop/range | 3 / -3R | 1 / -1R | 2 / -0.882493R |
| Impulso + T3-distance | 3 / -3R | 1 / -1R | 0 / 0R |

Nenhum candidato generalizou.

### 4h

15 eventos fechados, divisão 7/4/4.

| Candidato | Train | Validation | OOS |
|---|---:|---:|---:|
| Impulso + stop/range | 2 / -2R | 0 / 0R | 1 / -1R |
| Impulso + target/range | 2 / -2R | 1 / +2.930243R | 1 / -1R |
| T2→BOS + stop/range | 2 / -2R | 0 / 0R | 1 / -1R |
| Impulso + T3-distance | 2 / -2R | 1 / +2.930243R | 1 / -1R |

O único resultado positivo em Validation não persistiu no OOS.

### 12h

20 eventos fechados, divisão 10/5/5.

| Candidato | Train | Validation | OOS |
|---|---:|---:|---:|
| Impulso + stop/range | 4 / +2.629441R | 2 / -2R | 4 / -4R |
| Impulso + target/range | 2 / -2R | 0 / 0R | 1 / -1R |
| T2→BOS + stop/range | 1 / +0.068743R | 3 / -3R | 3 / -3R |
| Impulso + T3-distance | 2 / -2R | 2 / -2R | 4 / -4R |

O ganho de Train do primeiro candidato não sobreviveu ao Validation/OOS.

### 1d

15 eventos fechados, divisão 7/4/4.

| Candidato | Train | Validation | OOS |
|---|---:|---:|---:|
| Impulso + stop/range | 3 / -3R | 0 / 0R | 1 / -1R |
| Impulso + target/range | 1 / -1R | 0 / 0R | 1 / -1R |
| T2→BOS + stop/range | 3 / -3R | 1 / -1R | 0 / 0R |
| Impulso + T3-distance | 2 / -2R | 0 / 0R | 1 / -1R |

Nenhum candidato generalizou.

## Decisão

**Nenhuma combinação foi promovida ao Model 1.**

O padrão observado é consistente com os experimentos TAP3 anteriores: algumas condições conseguem selecionar subconjuntos com resultado positivo no Train ou ocasionalmente no Validation, mas não apresentam persistência no OOS.

O resultado de 4h, especialmente +2.930243R em Validation para os candidatos 2 e 4, não constitui validação porque ambos terminam em -1R no OOS.

## Consequência para o modelo

Não adicionar:

- filtro de impulso;
- filtro de stop/range;
- filtro de target/range;
- filtro T2→BOS;
- filtro simples de distância do Tap3 à Range.

Essas variáveis continuam registradas como features de pesquisa, mas não como regras de entrada.

## Próximo experimento

O próximo passo deve sair da busca de filtros binários e testar **informação contínua em regime**, mantendo o mesmo protocolo cronológico:

1. regressão/estratificação simples de R por quantis definidos no Train;
2. interação entre Tap3 e regime de Range;
3. análise separada por direção;
4. controle explícito de dependência entre eventos da mesma Range;
5. OOS final intocado.

A pesquisa continua separada do V5.6 prospectivo.

## V5.6 prospectivo

Execução `35552174907`, artefato `10619265247`, concluída com sucesso técnico.

Freeze: `2026-09-20T00:15:00Z`.

Resultado atual: 0 eventos prospectivos fechados em 1h, 4h, 12h e 1d. Portanto, os gates estatísticos permanecem **PENDING/FAIL por insuficiência de amostra**, e não há validação para dinheiro real.
