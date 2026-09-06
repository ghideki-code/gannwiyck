# GannWyck Model 1 — Especificação operacional

> Documento de engenharia. O objetivo é tornar o modelo explícito e testável. Onde a fonte estudada não fixa uma regra matemática completa, a implementação marca a decisão como hipótese.

## 1. Sequência

**Tendência → Range → DL → Tap 1 → Tap 2 → BOS → Tap 3 → confirmação → entrada/gestão.**

## 2. Tendência e Range

- Primeiro identificar a tendência.
- Em contexto de alta, o range é lido High → Low.
- Em contexto de baixa, Low → High.
- O midpoint do range é 0.5.
- O toque/retorno ao midpoint participa da validação do range.

A detecção automática presente no engine é uma aproximação computacional e não deve ser tratada como definição definitiva do método.

## 3. DL

A especificação estudada identifica DL com Fibonacci **1.35, 0 e -0.35**.

A âncora exata desses Fibos ainda não está demonstrada de forma suficiente nos materiais disponíveis. O engine atual usa Range Low como zero e calcula:

- `upper = RangeLow + 1.35 × Range`
- `zero = RangeLow`
- `lower = RangeLow - 0.35 × Range`
- `upperFromHigh = RangeHigh + 0.35 × Range`

Isso é uma **hipótese de implementação**, sujeita a validação.

## 4. Taps

O Model 1 trabalha com três steps/taps.

- Tap 1 inicia a sequência.
- Tap 2 é o extremo mais relevante dentro do DL.
- Em contexto de supply, Tap 2 procura o maior high dentro do DL.
- Em contexto de demand, Tap 2 procura o menor low dentro do DL.
- Tap 3 deve ocorrer depois de Tap 2 e não deve ficar excessivamente próximo dele.

## 5. BOS

O BOS precisa ocorrer **antes do terceiro tap**.

A confirmação operacional do engine é feita por **fechamento completo do candle** além do nível estrutural relevante.

- Alta: close acima do high estrutural.
- Baixa: close abaixo do low estrutural.

## 6. Extreme Supply / Extreme Demand

O Extreme Zone é associado ao Tap 2.

- Alta → Extreme Demand.
- Baixa → Extreme Supply.

A ideia de zona não mitigada e de seleção pelo timeframe deve ser refinada em uma próxima versão com dados e exemplos suficientes.

## 7. Alvo e proteção

Para distribuição/short, o alvo estrutural principal é **Range Low**.

Para acumulação/long, o engine usa **Range High** como espelho estrutural.

O stop preferencial da implementação é o **Tap 3**.

## 8. Time displacement

O terceiro tap não deve ser uma repetição imediata do segundo. O engine atual usa distância mínima de dois candles como regra inicial de engenharia.

Essa distância é parametrizável em versões futuras e deve ser calibrada com exemplos reais.

## 9. Timeframe

A metodologia estudada dá preferência a ranges com duração de pelo menos um dia, enquanto timeframes menores apresentam maior risco de ruído.

O engine não bloqueia timeframes menores. Ele apenas deixa essa decisão para a camada de validação.

## 10. O que NÃO está fechado

- âncoras matemáticas definitivas do DL;
- algoritmo definitivo de identificação automática do range;
- algoritmo definitivo de tendência;
- definição matemática completa de mitigação;
- definição quantitativa final de FVG/Structure Supply/Demand;
- filtros de timeframe e duração;
- critérios de qualidade do terceiro tap;
- gerenciamento parcial de posição.

Esses pontos devem permanecer explícitos para evitar transformar hipóteses em falsas certezas.
