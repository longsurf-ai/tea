---
title: Control flow
description: if, switch, counted and collection loops, while, break, continue and return, and the values these constructs produce.
---

`if`, `switch`, `for` and `while` are expressions. Each can stand alone as a
statement, or produce a value for a declaration or an assignment. Their bodies
are indented [blocks](./lexical-structure.md#indentation-and-blocks).

## Blocks and their values

- Each block is a scope: a variable declared inside it is not visible after
  it, and may hide an outer variable of the same name.
- A block's value is the value of its last statement: an expression, a
  declaration (its initial value) or an assignment (the assigned value). When
  the last statement produces nothing, such as a call that returns nothing,
  `emit`, `break`, `continue` or `return`, the block has no value.
- A structure whose value is needed but missing is an error where it
  initializes a variable, and allowed as a statement.
- The value of every control structure is `series`.

## Conditionals

### `if` and `else`

```text
if condition
    block
else if condition
    block
else
    block
```

- `condition` must be a `bool`; numbers are not converted.
- Only the selected branch runs.
- When the branches end with values of one type, the `if` produces that value.
  `int` and `float` branches give `float`, and an `na` branch takes the other
  branch's type unless that type is `bool`: with `true` in one branch and `na`
  in the other, the `if` has no value. A branch that ends in `return` does not
  contribute.
- Without an `else`, the value is the `then` branch's when the condition holds,
  and the type's [empty value](./types.md#empty-values) otherwise.
- When branch values have different types, or a branch has no value, the `if`
  has no value.

```tea
direction = if close > open
    1
else if close < open
    -1
else
    0
emit "direction" direction
```

```tea
gap = if close > open
    close - open
emit "gap" gap // na when the bar did not rise
```

The [`?:`](./expressions.md) operator is the one-line form of `if`.

### `switch`

```text
switch subject
    pattern => expression
    pattern =>
        block
    => expression
```

```text
switch
    condition => expression
    => expression
```

- With a subject, the arms are tried in order, and the first arm whose pattern
  equals the subject runs. Patterns must be comparable with the subject, and
  equality follows `==`: a missing subject matches no pattern.
- Without a subject, each pattern is a `bool` condition, and the first true
  one runs.
- At most one arm runs; there is no fall-through. Patterns after the matching
  arm are not evaluated.
- A bare `=>` arm is the default. There is at most one, it must be last, and
  it runs when no other arm matched.
- An arm written on one line takes an expression. Statements such as
  assignments or `break` need an indented block.
- The value is the running arm's value. Arm values combine as `if` branches
  do. When no arm runs, the value is the type's empty value.

```tea
enum Trend
    up
    down
    flat

trend = close > open ? Trend.up : close < open ? Trend.down : Trend.flat
word = switch trend
    Trend.up => "rising"
    Trend.down => "falling"
    => "unchanged"
emit "word" word
```

```tea
barRange = high - low
bucket = switch
    barRange > 2.0 => "wide"
    barRange > 1.0 => "normal"
    => "narrow"
emit "bucket" bucket
```

## Loops

All iterations of a loop run within one step. A
[history](./expressions.md) read in the body reads earlier steps, never
earlier iterations: `x[1]` is the value `x` had at the end of the previous
step, on every iteration.

```tea
total = 0
for i = 1 to 3
    total += i
    emit.append "previous" total[1] // first step: na, na, na; later: 6, 6, 6
```

### `for` … `to` … `by`

```text
for index = start to end
    block
for index = start to end by step
    block
```

- `index` is a new variable, local to the loop. `start`, `end` and `step` are
  evaluated once, in that order, before the first iteration.
- Both bounds are inclusive. `step` defaults to `1`. With a positive step the
  loop runs while `index <= end`; with a negative step, while `index >= end`.
  Without `by`, a `start` greater than `end` runs no iterations; write
  `by -1` to count down.
- A constant step of zero is an error. A step that is zero or `na` when the
  loop starts runs no iterations, and so do `na` bounds.
- The bounds and step are numbers. `index` is an `int`, or a `float` when
  `start`, `end` or `step` is a float.
- After each iteration, `index` advances by `step` from its current value, so
  assigning to `index` in the body moves the loop. A float step too small to
  change `index` ends the loop.

```tea
total = 0
for i = 1 to 4
    total += i
emit "total" total // 10

countdown = ""
for i = 3 to 1 by -1
    countdown += str.tostring(i)
emit "countdown" countdown // "321"
```

```tea
steps = 0
for i = 0 to 10
    steps += 1
    i := i + 4
emit "steps" steps // 3: i is 0, 5 and 10
```

### `for` … `in`

```text
for element in array
for [index, element] in array
for [key, value] in map
```

Visits each element of an array, or each key-value pair of a map.

- The collection is evaluated once, when the loop starts, and the loop visits
  that value. Arrays are visited from index 0 upward; maps in insertion order,
  where putting an existing key again keeps its original position.
- Updating the collection inside the body does not add, remove or reorder the
  iterations of the loop in progress.
- The loop variables are new and local to the loop. Assigning to them does not
  change the collection; use a function such as `values.set()` for that.
- An array loop names either `element` or `[index, element]`; `index` is an
  `int`. A map loop must name `[key, value]`. Matrices cannot be iterated: use
  `rows()`, `columns()` and `get()`.
- Loop variables are `series`.

```tea
values = array.from(3, 5, 8)

lastSquare = for element in values
    element * element

emit "lastSquare" lastSquare // 64
```

```tea
values = array.from(2, 4, 6)
weighted = 0

for [index, element] in values
    weighted += index * element

emit "weighted" weighted // 16
```

```tea
values = map.new<string, int>()
values.put("left", 2)
values.put("right", 3)
total = 0

for [key, value] in values
    total += value

emit "total" total // 5
```

The loop below visits the two elements the array had when the loop started:

```tea
values = array.from(1, 2)
visited = 0

for element in values
    visited += 1
    values.push(element + 10)

emit "visited" visited    // 2
emit "size" values.size() // 4
```

### `while`

```text
while condition
    block
```

- `condition` must be a `bool`. It is evaluated before every iteration,
  including after `continue`.
- Tea does not limit the number of iterations: a condition that never becomes
  false never ends the step.

```tea
level = 1.0
halvings = 0
while level > 0.1
    level /= 2
    halvings += 1
emit "halvings" halvings // 4
```

### Loop values

A loop's value is the value its body last produced: the body's final value
from the latest iteration that reached the end of the body.

- `continue` skips the rest of the body, so that iteration produces no value.
- `break` leaves the loop, keeping the value of the latest iteration that
  finished.
- When no iteration reaches the end of the body, the value is the type's
  empty value.
- A body that ends without a value gives the loop no value.

```tea
r = for i = 1 to 5
    if i == 3
        break
    i * 10
emit "r" r // 20
```

## Leaving early

### `break` and `continue`

- `break` leaves the innermost enclosing loop. `continue` ends the current
  iteration: a `for` loop advances its index, a `for … in` loop moves to the
  next element, and a `while` loop tests its condition again.
- Both are valid only inside a loop. Inside a `switch` arm within a loop, they
  apply to the loop.

```tea
found = -1
for i = 0 to 9
    if i * i > 20
        found := i
        break
emit "found" found // 5
```

```tea
count = 0
for i = 1 to 10
    switch i
        3 =>
            break
        =>
            count += 1
emit "count" count // 2
```

### `return`

```text
return expression
return
```

Ends the enclosing function or method, from any depth of nested blocks and
loops.

- `return` is valid only inside a function or method body. The top level of a
  script runs to its end.
- A function's result is the shared type of its `return` values and its final
  value. Every path must produce one: a function cannot return a value on one
  path and fall off the end without one on another.
- A bare `return` produces no value. It ends a `void` method, including one
  whose last statement would otherwise produce a value.
- `return` inside a `var` initializer leaves the function and leaves the
  variable uninitialized, so its initializer runs again the next time it is
  reached.
- Returning does not save anything early: a step's changes are kept only when
  the whole step succeeds.

```tea
choose(bool flag) =>
    if flag
        return 1
    return 2

emit "chosen" choose(close > open)
```

```tea
firstAbove(array<float> values, float limit) =>
    for value in values
        if value > limit
            return value
    float(na)

emit "first" firstAbove(array.from(1.0, 5.0, 9.0), 4.0) // 5
```
