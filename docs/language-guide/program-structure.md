---
title: Program Structure
---

Let's write a program that keeps a running score as prices arrive. The rule is
simple: when the price is above a threshold, add the difference multiplied by a
`gain`; when it's below, subtract the difference. At the threshold, leave the
score unchanged.

In Tea, we'd write something like this:

```tea
gain = input.float(1.5, "Gain")
threshold = input.float(10.0, "Threshold")

var float score = 0.0
if close > threshold
    score := score + (close - threshold) * gain
else if close < threshold
    score := score - (threshold - close)

regime = close > threshold ? 1 : close < threshold ? -1 : 0

emit "score" score
plot("score-plot", score, "Running score")
plot("regime-plot", regime, "Regime")
```

That's the whole program. Let's go through it.

## Inputs

There are two kinds of inputs here. `gain` and `threshold` are **parameters**:
values we choose before a run. Their defaults are `1.5` and `10.0`. We can run
the same program with a different gain without editing the calculation.

`close` is a **time-series input**. It takes its value from the row currently
being processed. On price bars, that's the closing price. The application
running Tea supplies this data; the script doesn't need to open a CSV file or
connect to a market-data service.

The variable name `gain` identifies the parameter. The string "Gain" is its
label, which an application can show in a settings panel.

## Calculation and state

`score` starts at zero. The `var` keyword means this initialization happens once,
and the value is kept for the next step. `:=` updates that value. So if the first
close is `12`, we add `(12 - 10) * 1.5 = 3`. If the next close is `9`, we subtract
`1`, leaving a score of `2`.

`regime` is calculated again on each step: `1` above the threshold, `-1` below,
and `0` at it. The `? :` expression chooses between these values. Tea infers its
type; the `float` annotation on `score` explicitly makes it a floating-point value.

Blocks use indentation. The two statements under `if` and `else if` run only
when their respective conditions are true.

## Outputs

`emit "score" score` produces the numeric score for this step. The two `plot`
calls produce descriptions of what to draw. An application can turn these into
chart lines, while another application might just collect the numeric output.

The first argument to `plot` is a stable output ID, the second is the value,
and the third is a display title. `plot` is available without an import.

An ordinary Tea program can produce numbers, plots, and events together.
As it grows, we can move calculations into [functions](./values-and-control-flow.md#functions-and-loops)
or [libraries](../imports.md).

## Optional chart metadata

An entry may begin with an `indicator()` header that tells a host how to show
it: a title, whether to draw over the price chart, and, with
`timeframe = "auto"`, that the host may run it on finer bars of the same
symbol. It must be the first statement, appear once, and use literal
arguments with a non-empty title. Tea runs the program the same way with or
without it, and there is no `strategy()` header.

```tea
indicator("RSI", overlay = false)
length = input.int(14, "Length", minval=1)
plot("rsi", ta.rsi(close, length), "RSI")
```

## Life cycle of a Tea program

There are three stages to running this program:

1. **Compilation:** Tea checks the source and compiles it with its dependencies.
2. **Binding:** the application supplies parameters and input data streams.
3. **Execution:** the runtime repeatedly evaluates the program as data arrives.

This separation lets us use the same source with another dataset or another set
of parameters. The [execution model](./execution-model.md) shows what that
repeated evaluation actually looks like.
