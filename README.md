# GannWyck Model 1

Projeto experimental para formalizar e testar o GannWyck Model 1 em dados OHLC.

## Objetivo

Transformar as regras estudadas do método em regras explícitas, auditáveis e testáveis, mantendo separadas as hipóteses ainda não comprovadas.

## Estado

Primeira versão: engine JavaScript independente + interface web para testar candles reais da Binance.

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

## Executar

Abra `index.html` diretamente no navegador. A página usa a API pública de candles da Binance e a biblioteca Lightweight Charts via CDN.

## Estrutura

- `index.html` interface de teste
- `src/gannwyck-model1.js` engine do Model 1
- `docs/MODEL-1-SPEC.md` especificação das regras
- `tests/model1-tests.html` testes básicos do engine
