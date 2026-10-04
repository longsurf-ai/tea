---
title: Outputs
description: Writing named output columns with emit and emit.append, and what each step publishes.
---

A Tea program reports results by writing named outputs. Each name is one
column with a fixed type, and each successful step publishes one row holding
every column. [Plot functions](../builtins/plots.md) such as `plot()` write
their outputs the same way, under the ID passed as their first argument. The
[outputs and events](../../language-guide/outputs-and-events.md) guide shows
how hosts use them.

## Writing outputs

### `emit`

```text
emit name value
```

Writes `value` to the column `name` for the current step. The column holds at
most one value per step.

- Only one `emit` statement may write a given name, even when two statements
  sit in different branches of an `if`. A function that emits counts once for
  each call written in the source.
- That statement may run at most once per step. It cannot sit in a `for … in`
  or `while` loop, or in a `for` loop unless its constant bounds allow at most
  one iteration and its index is never assigned. The same applies to a call of
  a function that emits.
- On a step where the statement does not run, such as inside an `if` whose
  condition is false, the column is null in that step's row.

```tea
emit "price" close
if close > open
    emit "gain" close - open
```

### `emit.append`

```text
emit.append name value
```

Appends `value` to the column's list for the current step.

- Any number of `emit.append` statements may write one name, including inside
  loops and functions.
- Each step's list starts empty and keeps values in the order they were
  appended. A step with no appends publishes an empty list.
- `append` is a keyword only directly after `emit.`.

Each row of this program has one price and a two-element list:

```tea
emit "price" close
emit.append "samples" close
emit.append "samples" open
```

## Output names

A name is a compile-time constant string, written as one of:

- a string literal: `emit "price" close`;
- a name bound to a constant string, such as one declared with
  `const string id = "price"`;
- a parenthesized expression of constants: `emit (prefix + ".fill") qty`;
- a function parameter that receives a constant string at every call.

Without parentheses, only a single literal or name may come before the value,
so `emit "a" + "b" x` is a syntax error.

- A name cannot depend on `input` or `series` values, and cannot be empty.
- `index`, `time`, `timed` and `provisional` name the fields that published
  rows carry beside the outputs, and cannot be used.

```tea
const string prefix = "trade"
for i = 0 to 2
    emit.append (prefix + ".fill") i
```

A function can forward a constant name to `emit`. Each call with a different
name writes a different column:

```tea
publish(const string id, float value) =>
    emit id value

publish("price", close)
publish("open", open)
```

## Output values

- A column holds any value a collection can store: `int`, `float`, `bool`,
  `string`, `color`, an enum, a struct, an array, a matrix, a map or a drawing
  handle. A tuple is also accepted and is written as a record with fields
  `_0`, `_1` and so on.
- A bare `na` cannot be written, because it has no type: declare a typed
  variable such as `float level = na` and emit that. A value of type `void`
  cannot be written.
- A struct type that refers to itself, directly or through other types and
  collections, cannot be written.
- Every write to one name must use the same mode and the same type. `emit` and
  `emit.append` cannot share a name, an `int` value cannot share a column with
  a `float` value, and two struct types with identical fields are still
  different.
- `emit` cannot run inside a `request.*` expression or from a `var` or
  `varip` initializer.

[Runtime](../../runtime.md#arrow-schemas-and-published-rows) defines how each
type appears in a published row.

## Steps and rows

- `emit` captures the value when it runs. Changing a struct or collection
  later in the step does not change what was written.
- A successful step publishes one row with every column, in a fixed order set
  during compilation.
- A plain column that was not written holds null. Writing `na` also publishes
  null, except that a numeric `na` publishes NaN, which stays distinct from
  null.
- A runtime error stops the run: the step where it happens publishes nothing,
  including values it emitted before the error, and no later step runs.

```tea
struct Order
    float price

order = Order.new(close)
emit "order" order
order.price := 0.0 // the row still holds the close
```
