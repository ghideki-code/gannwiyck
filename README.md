# GannWyck Model 1

Projeto experimental para formalizar e testar o GannWyck Model 1 em dados OHLC.

## Objetivo

Transformar as regras estudadas do método em regras explícitas, auditáveis e testáveis, mantendo separadas as hipóteses ainda não comprovadas.

## Terminal online

- `index.html` terminal principal com atualização automática e preço LIVE.
- `research.html` laboratório histórico para backtest, com seleção de período, timeframes e ocorrências clicáveis.
- `src/gannwyck-model1.js` engine do Model 1.

## Timeframes

15M, 30M, 1H, 4H, 8H, 12H, 1D, 3D, 5D, 1W, 1M e 2M.

Os timeframes compostos são agregados no navegador quando necessário.

## Research / Backtest

O laboratório permite selecionar 7, 30, 90, 180 dias ou 1 ano, carregar o histórico disponível e executar o motor sobre cada janela histórica. Cada ocorrência mostra Entry, Stop, Target, R:R e resultado. Ao clicar numa ocorrência, o gráfico navega para o BOS e marca T1, T2, BOS e T3.

O backtest mede somente as regras atualmente codificadas. Ele não valida a metodologia original.

## Modelo 1

Fluxo principal:

1. Identificar tendência e range.
2. Definir Range High / Range Low.
3. Calcular DL como níveis Fibonacci 1.35, 0 e -0.35.
4. Identificar três taps/steps.
5. Tap 2 representa o extremo dentro do DL.
6. Exigir BOS antes do Tap 3.
7. Confirmar BOS por fechamento completo do candle.
8. Usar Tap 3 como referência de proteção/stop.
9. Para distribuição, Range Low é o alvo estrutural principal.

### Importante

As âncoras exatas usadas para calcular os níveis Fibonacci ainda são uma hipótese de implementação e devem ser validadas contra exemplos do método original.

## Atualização automática

O terminal principal atualiza os candles periodicamente e mantém o preço via stream público da Binance. A análise é refeita quando o histórico é atualizado.

## Publicação

O repositório inclui GitHub Pages via `.github/workflows/pages.yml`. Depois de habilitar Pages usando GitHub Actions nas configurações do repositório, cada push em `main` pode publicar automaticamente a versão online.

## Estrutura

- `index.html` interface principal
- `research.html` laboratório de pesquisa/backtest
- `src/gannwyck-model1.js` engine do Model 1
- `docs/MODEL-1-SPEC.md` especificação das regras
- `tests/model1-tests.html` testes básicos do engine
- `.github/workflows/pages.yml` publicação automática
