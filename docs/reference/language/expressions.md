---
title: Expressions and operators
description: Operator precedence, arithmetic, comparison, logic, the conditional operator, history, member access, calls, and how na moves through expressions.
---

An expression computes a value with a type and a
[qualifier](./types.md#qualifiers); an operator's result takes the most
variable qualifier of its operands. Assignment is a statement, not an operator;
see
[declarations](./declarations.md). `if`, `switch` and the loops are also
expressions; see [control flow](./control-flow.md).

## Precedence

From the tightest binding to the loosest:

| Operators                       | Associativity |
| ------------------------------- | ------------- |
| `x.name`, `f(...)`, `x[offset]` | Left to right |
| Unary `-`, `+`, `not`           | Right to left |
| `*` `/` `%`                     | Left to right |
| `+` `-`                         | Left to right |
| `<` `<=` `>` `>=`               | Left to right |
| `==` `!=`                       | Left to right |
| `and`                           | Left to right |
| `or`                            | Left to right |
| `? :`                           | Right to left |

- Parentheses group: `(a + b) * c`.
- `-x[1]` is `-(x[1])`, and `-2 * 3` is `(-2) * 3`.
- `not` binds tighter than comparisons: `not x > 5` means `(not x) > 5`, which
  is a type error. Write `not (x > 5)`.
- Comparisons do not chain: `a < b < c` compares a `bool` with a number and is
  an error.
- `a ? b : c ? d : e` is `a ? b : (c ? d : e)`.

## Operators

### Arithmetic: `+` `-` `*` `/` `%`

| Operands                        | Result   |
| ------------------------------- | -------- |
| `int` and `int`                 | `int`    |
| `int` or `float` with a `float` | `float`  |
| `string` `+` `string`           | `string` |

- `/` on two `int` values truncates toward zero: `7 / 2` is `3` and `-7 / 2` is
  `-3`. Make one operand a `float` for an exact quotient.
- `%` is the remainder of that division and has the sign of the left operand:
  `-7 % 3` is `-1` and `7 % -3` is `1`. It also works on floats: `-7.5 % 2` is
  `-1.5`.
- Dividing by zero, with `/` or `%`, gives `na` for `int` and `float` alike.
  Any result that is not a finite number is `na`.
- `+` joins two strings. Other operands must be numbers: `"a" + 1` is an error;
  convert with `str.tostring()`. `bool` values have no arithmetic.
- Unary `-` negates a number and unary `+` returns it unchanged.
- Operators on constants are computed during compilation, with the same
  results.

```tea
emit "quotient" 7 / 2    // 3
emit "exact" 7 / 2.0     // 3.5
emit "remainder" -7 % 3  // -1
emit "byZero" 1 / 0      // na
emit "label" "bar " + str.tostring(bar_index)
```

### Comparison: `==` `!=` `<` `<=` `>` `>=`

Comparisons produce a `bool`.

- `<`, `<=`, `>` and `>=` compare numbers; `int` and `float` mix.
- `==` and `!=` compare numbers, `bool`, `string`, `color` (equal channels are
  equal), values of one enum type, and drawing handles. Arrays, matrices, maps,
  structs and tuples cannot be compared; test a struct reference with `na(x)`.
- A comparison involving a missing value is `false`. That includes `!=`, and
  `==` between two missing values.
- `na` written directly in a comparison is an error: `x == na` does not
  compile. Use `na(x)`.
- Floats compare exactly, as binary floating-point numbers.

```tea
float missing = na
emit "equal" missing == missing  // false
emit "different" missing != 1.0  // false
emit "isMissing" na(missing)     // true
```

### Logical: `and` `or` `not`

The operands must be `bool`; numbers and other values are not converted. A
`bool` is never `na`, so logic has no missing case.

- `and` evaluates its right operand only when the left one is `true`, and `or`
  only when the left one is `false`.
- `not` negates its operand.

```tea
values = array.new<float>()
safe = values.size() > 0 and values.first() > 0
emit "safe" safe // false; first() never runs on an empty array
```

A call that keeps history, such as a `ta` function, sees only the steps on
which it is evaluated. To use one in a condition, compute it unconditionally
first; see [values and control flow](../../language-guide/values-and-control-flow.md).

### Conditional: `?:`

```text
condition ? whenTrue : whenFalse
```

- `condition` must be a `bool`. Only the selected branch is evaluated.
- The branches must share a type: `int` and `float` give `float`, and `na`
  takes the other branch's type. Other mismatches are errors.
- The result's qualifier is the most variable of the condition and both
  branches.

```tea
regime = close > open ? 1 : close < open ? -1 : 0
emit "regime" regime
```

### History: `[]`

```text
name[offset]
(name)[offset]
```

Reads the value that a variable or built-in value held `offset` steps ago.
`close[1]` is the previous step's close; `close[0]` is the current one.

- `name` is a variable, including a parameter, or a built-in value the host
  supplies, such as `close`, `bar_index` or `syminfo.ticker`. A call, an
  arithmetic expression, a field selection or a collection access is not a
  valid operand. `const` variables and built-in constants such as `math.pi`
  have no history. Declare a variable to read the history of a computed value.
- `offset` is an `int` expression. An offset that is negative or `na`, or that
  reaches back past the available steps, gives the type's empty value: `na`,
  or `false` for a `bool`.
- An offset whose largest value is known before execution, such as a constant,
  an `input` value or a loop index bounded by one, reaches as far back as it
  needs. Any other offset reaches back at most 500 steps; reading further gives
  the empty value.
- History applies before member access: `point[1].x` reads `x` from the
  reference `point` held one step ago; `point.x[1]` is an error.
- `x[i]` is never element access. Read array elements with `values.get(i)`.
- The result is `series`.
- History records completed steps. While the current row is recalculated on
  live data, `x[1]` stays on the previous completed row.

```tea
previous = nz(close[1], close)
rising = close > previous
emit "rising" rising ? 1 : 0
```

History of a collection keeps the contents the collection had on that step;
structs it contains are still references:

```tea
var values = array.new<int>()
before = values[1]
values.push(bar_index)
emit "previousSize" na(before) ? 0 : before.size()
```

History of a struct variable holds the earlier reference, not a copy of its
fields: when the variable was not reassigned, `point[1]` and `point` are the
same object. Bind a field to read its history:

```tea
struct Point
    float x

point = Point.new(close)
x = point.x
emit "x" x[1]         // history of the binding x
emit "old" point[1].x // x of the reference point held one step ago
```

See [time series](../../language-guide/time-series.md) and the
[memory model](../../memory-model.md#history-versions-bindings).

### Member access: `.`

```text
value.field
value.method(arguments)
namespace.name
```

- `value.field` reads a struct field, and `this.field` reads a field of a
  method's receiver. A field read is `series`.
- `value.method(...)` calls a method of a struct, or a function of an array,
  matrix or map.
- `namespace.name` reaches a built-in such as `math.pi`, `color.red` or
  `ta.sma`, or an export of an imported library: `pkg.f()`, `pkg.Type.new()`,
  `pkg.Enum.member`.
- `Enum.member` names an enum member, and `Type.new(...)` constructs a struct.
- Reading a field through an `na` reference gives the field's empty value.
  Assigning a field, or calling a mutable method, through `na` stops the step
  with a runtime error.

### Calls: `()`

```text
function(argument, ..., name = argument)
receiver.method(argument, ...)
function<Type>(argument, ...)
```

- Positional arguments come first, then named ones. A positional argument
  after a named one, an unknown name, or a parameter given twice is an error.
  An omitted parameter takes its default; a parameter without one must be
  given.
- Arguments are evaluated in the order written. Defaults for omitted
  parameters are evaluated after them.
- For arrays, matrices and maps, `values.push(x)` is the same call as
  `array.push(values, x)`: the receiver is the first argument. A function that
  updates a collection needs a variable or struct field as its receiver, so
  `array.from(1).push(2)` is an error.
- Built-in generic functions accept type arguments directly before `(`:
  `array.new<float>(3)`, `map.new<string, int>()`. Functions you write, methods
  and `.new()` do not.

```tea
length = input.int(14, "Length", minval = 1)
values = array.new<float>()
values.push(close)
array.push(values, open)
emit "count" values.size() // 2
emit "length" length
```

### Tuples: `[a, b]`

`[a, b, ...]` builds a [tuple](./types.md#tuple). It is the value of a
function or block that returns several values, and must be destructured
where it is declared.

## `na` in expressions

| Expression                                   | Result                                    |
| -------------------------------------------- | ----------------------------------------- |
| Arithmetic or unary `-` with an `na` operand | `na`                                      |
| Division or `%` by zero, non-finite results  | `na`                                      |
| `+` with an `na` string                      | `na`                                      |
| Any comparison involving `na`                | `false`                                   |
| Field read through an `na` struct reference  | The field's empty value                   |
| `na(x)`                                      | `true` when `x` is missing                |
| `nz(x, replacement)`                         | `x`, or `replacement` when `x` is missing |

```tea
float price = na
emit "sum" price + 1      // na
emit "filled" nz(price, 0.0) + 1 // 1
```

`bool` values are never `na`, and `na` written directly in a comparison is an
error. [Core functions](../builtins/core.md) documents `na()` and `nz()`.
