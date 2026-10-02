---
title: Execution Model
---

Tea has a **step-by-step** execution runtime. That means a Tea program is
repeatedly executed against a dataset, row by row. Conceptually this is simple.
Consider the following price data:

| index | open | close | high | low |
| ----- | ---- | ----- | ---- | --- |
| 0     | 1.0  | 1.2   | 1.3  | 0.9 |
| 1     | 1.2  | 0.9   | 1.2  | 0.8 |
| 2     | 0.9  | 0.7   | 1.0  | 0.7 |

And a Tea program like this:

```tea
foo = close - open
bar = foo - foo[1]

emit "foo" foo
emit "bar" bar
```

`foo` is the price move within each bar. `bar` measures how that move differs
from the previous bar. The program produces the following values, rounded for
display:

| index | foo  | bar  |
| ----- | ---- | ---- |
| 0     | 0.2  | `na` |
| 1     | -0.3 | -0.5 |
| 2     | -0.2 | 0.1  |

Let's follow the second row. Tea binds `open` to `1.2` and `close` to `0.9`,
then runs the program from top to bottom. `foo` becomes `-0.3`. `foo[1]` is still
`0.2`, the value from the previous row, so `bar` becomes `-0.5`.

On the first row, there is no previous value of `foo`. Its numeric history is
`na` (not available), and the subtraction also produces `na`.

## Where the loop went

The Tea program above, along with the runtime that drives it, can be thought
of as the following Python code:

```python
def run(dataset):
    foo = [None] * len(dataset)
    bar = [None] * len(dataset)

    for i, row in enumerate(dataset):
        foo[i] = row["close"] - row["open"]
        if i > 0:
            bar[i] = foo[i] - foo[i - 1]

        yield {"foo": foo[i], "bar": bar[i]}
```

Here, Python's `None` stands in for Tea's `na`.

Note how the Tea version doesn't explicitly store `foo` in a list or retrieve
it from a state object. Variables carry their history, and we access it through
the **history operator `[]`**: `foo[1]` is one step ago, `foo[2]` is two steps ago.
This works for calculated variables as well as inputs like `close`.

One strength of Tea is being able to express these **temporal dependencies**
succinctly. We write the calculation; Tea handles the loop, the input values,
and the history needed by the program. The Python lists above illustrate the
behavior, rather than how Tea actually allocates memory.

## Recalculating and remembering

`foo = close - open` is evaluated again on every row. If we want a value to carry
forward and accumulate, we use `var`:

```tea
var float total = 0.0
total := total + (close - open)
emit "total" total
```

For the three rows above, `total` is `0.2`, then `-0.1`, then `-0.3`.
`var` initializes it once; `:=` updates the existing value. We can still read
`total[1]` to get its value on the previous completed step.

## Historical data and live updates

The same calculation can run over historical bars or receive live data as it
arrives. The application supplies the data; the Tea program describes what to do
with each step.

There is one extra detail with live bars: the latest bar may change several
times before it closes. Tea reevaluates that same bar. `close` reflects the
latest update, while `close[1]` still refers to the previous completed bar.
History advances when the current bar is finalized.

For a numeric variable such as `total`, `var` updates are rolled back between
updates of the same bar. `varip` keeps those updates instead. This distinction
matters when counting price updates rather than completed bars. Use
`barstate.isconfirmed` for logic that should run only when a bar closes.

The [memory model](../memory-model.md#transactions-realtime-var-and-varip)
covers these live-state rules in detail, including how objects behave.
