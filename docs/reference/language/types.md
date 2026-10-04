---
title: Types and qualifiers
description: Tea's value types, how to write them, their empty values, and the const, input, simple and series qualifiers.
---

Every Tea value has a type, such as `float` or `array<int>`, and a qualifier,
such as `series`, that says when the value becomes known. Together they read
`series float`: a float that may change on every step.

## Type annotations

```text
Type name = value             // a typed declaration
f(Type param) => ...          // a typed parameter
f(qualifier Type param) => ...
```

| Form                                               | Type                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `int` `float` `bool` `string` `color`              | Value types                                                                   |
| `line` `label` `box` `table` `polyline` `linefill` | Drawing handles                                                               |
| `array<T>` or `T[]`                                | Array of `T`; `int[][]` is `array<array<int>>`                                |
| `matrix<T>`                                        | Matrix of `T`                                                                 |
| `map<K, V>`                                        | Map from `K` to `V`                                                           |
| `Name`                                             | A struct or enum declared in this file                                        |
| `pkg.Name`                                         | A struct or enum exported by an imported library                              |
| `Name<Arg>`                                        | A [generic struct](./declarations.md#type-parameters) with its type arguments |

Annotations appear in declarations, parameters, fields, method results and
interface method signatures. `na`, tuples and `void` have no annotation form,
except `void` as a method result.

### Conversions

- An `int` converts to `float` wherever a float is expected. No other
  conversion is implicit: `float` to `int` needs `int(x)`, which truncates
  toward zero.
- `na` is accepted wherever any type except `bool` is expected.
- Collection types must match exactly: an `array<int>` is not an
  `array<float>`. Write `array.from(1.0, 2.0)` or `array.from<float>(1, 2)` for
  a float array.
- Structs and enums are nominal: two declarations with the same fields or
  members are different types.

### Empty values

When Tea needs a value it does not have, it uses the type's empty value: for an
`if` without `else` whose condition is false, a loop that runs no iterations, a
`switch` with no matching arm, a history read before the first available step,
the elements of `array.new<T>(n)`, and the fields of an `na` struct reference.

| Type             | Empty value |
| ---------------- | ----------- |
| `bool`           | `false`     |
| every other type | `na`        |

## Value types

### `int`

Whole numbers. Arithmetic on two `int` values gives an `int`, and `/` truncates
toward zero. Values are stored as 64-bit floating-point numbers, so integers
are exact up to 2⁵³. An `int` can be `na`.

### `float`

64-bit floating-point numbers. A result that is not a finite number, such as
an overflow or a division by zero, is `na`. Decimal values such as `0.1` are not
exact; see [values and control flow](../../language-guide/values-and-control-flow.md)
for comparing computed prices against thresholds.

### `bool`

`true` or `false`. A `bool` is never `na`: `bool ready = na` is an error, a
`bool` parameter does not accept `na`, and the empty value is `false`. Test a
missing value of another type with `na(x)`, which returns a `bool`.

### `string`

Text. `+` concatenates two strings, and `==` and `!=` compare them; strings have
no ordering operators. A `string` can be `na`. `str.tostring()` converts
numbers, booleans, colors and enum values to strings.

### `color`

An RGBA color, written as a literal such as `#2962FF` or `#2962FF80`, built
with `color.new()` or `color.rgb()`, or taken from a constant such as
`color.red`. Two colors are equal when their channels are equal. A `color` can
be `na`. See [color](../builtins/color.md).

## Drawing handles

### `line`, `label`, `box`, `table`, `polyline`, `linefill`

These types name drawing objects owned by a host. No built-in function creates
one, so every handle value in a script is `na`. A script can declare
variables, fields and collection elements of these types and test them with
`na()`. They cannot be map keys.

```tea
line marker = na
labels = array.new<label>()
emit "noMarker" na(marker)  // true
emit "labels" labels.size() // 0
```

## Collections

Arrays, matrices and maps hold their contents by value: assigning a collection,
or passing it to a function, gives the destination the collection's current
contents, and a later update through one variable, field or parameter does not
change the others. A function that pushes to its argument leaves the caller's
collection unchanged. A collection of structs holds references to them. The
[memory model](../../memory-model.md) defines both behaviors.

A collection is updated by a built-in function such as `push`, called on a
variable or a struct field. A temporary collection, or one read through
history, cannot be updated. Every collection function is also a method of the
collection: `values.push(x)` is the same call as `array.push(values, x)`.

In built-in signatures, a type parameter written `T: storable` accepts any type
except `void`, `na` and tuples, and `K: map-key` accepts `int`, `float`,
`bool`, `string`, `color` and enums.

### `array`

```text
array<T>
T[]
```

An ordered, variable-length collection whose elements all have type `T`.
Positions start at zero.

- `array.new<T>(size)` fills each position with `T`'s empty value; pass a
  second argument for another initial value. `array.from(a, b, ...)` infers
  `T` from its arguments.
- `values[i]` is not element access: it is the
  [history](./expressions.md) of `values`. Use `values.get(i)` and
  `values.set(i, x)`, or visit every element with
  [`for … in`](./control-flow.md).
- Reading outside the array's bounds stops the run with a runtime error.

Assigning an array keeps the value it had at that moment:

```tea
values = array.from(10, 20)
earlier = values
values.push(30)

emit "earlier" earlier.size() // 2
emit "values" values.size()   // 3
```

Arrays of structs hold references, so a change to the struct shows through
every array that holds it:

```tea
struct Point
    int x

point = Point.new(1)
left = array.from(point)
right = array.from(point)

point.x := 2
emit "left" left.get(0).x   // 2
emit "right" right.get(0).x // 2
```

See [array functions](../builtins/array.md).

### `matrix`

```text
matrix<T>
```

A rectangular collection with a fixed number of rows and columns, all of type
`T`. Rows and columns are numbered from zero.

```tea
grid = matrix.new<float>(2, 3, 0.0)
grid.set(0, 1, 1.5)
emit "cell" grid.get(0, 1) // 1.5
emit "rows" grid.rows()    // 2
```

See [matrix functions](../builtins/matrix.md).

### `map`

```text
map<K, V>
```

A collection of key-value pairs that keeps keys in insertion order. Keys are
`int`, `float`, `bool`, `string`, `color` or an enum; values may be any
storable type.

```tea
counts = map.new<string, int>()
counts.put("up", 3)
counts.put("down", 1)
emit "up" counts.get("up") // 3
```

See [map functions](../builtins/map.md).

## Declared types

### `enum`

A nominal type with a fixed set of named members, declared with
[`enum`](./declarations.md#enum). A member is written `Name.member`, is a
`const` value, and compares with `==` and `!=`. An enum value can be `na`, and
enums can be map keys.

### `struct`

A nominal reference type with fields and methods, declared with
[`struct` or `type`](./declarations.md#struct-and-type). Assigning a struct
value copies the reference, not the fields, and `Name.new()` creates a new
object each time. Structs have no `==`; test for a missing reference with
`na(x)`. The empty value is `na`, and reading a field through `na` gives the
field's empty value.

## Types without an annotation

### `na`

The type of the bare `na` literal before its context gives it a concrete type.
The context comes from an annotation (`float level = na`), a typed parameter,
or the other branch of a `?:` or `if`. Where there is no context, `na` is an
error: `level = na` needs an annotation, and an untyped parameter cannot
receive `na`. `na` is never accepted where a `bool` is expected.

### `tuple`

```text
[T1, T2, ...]
```

The value of `[a, b]`: several values returned together, by a function or a
block. A tuple must be [destructured](./declarations.md#tuple-destructuring)
at its declaration, as `[bottom, top] = f()`. It cannot be stored in one
variable, a field or a collection, read through history, or compared. Its
elements cannot be bare `na` or another tuple.

### `void`

The type of an expression with no value, such as a call to `array.push()` or a
block that ends with one. A `void` value cannot initialize a variable or be
written to an output. `void` is written only as a method's result type.

## Qualifiers

A qualifier says when a value becomes known. From least to most variable:

| Qualifier | Known                                   | Examples                                                   |
| --------- | --------------------------------------- | ---------------------------------------------------------- |
| `const`   | When the script compiles                | Literals, `const` declarations, `color.red`, `math.pi`     |
| `input`   | When the host binds the script's inputs | Values of `input.int()` and most other `input.*` functions |
| `simple`  | Before the first step                   | `syminfo.ticker`, `timeframe.period`                       |
| `series`  | On each step                            | `close`, `bar_index`, `var` variables                      |

A value can be used wherever a later qualifier is accepted: a `const` value
works where a `series` one is expected, never the other way.
[Reading the reference](../overview.md#reading-signatures) explains how
signatures show the qualifiers a parameter accepts.

```tea
length = input.int(14, "Length") // input int
const float factor = 2.0         // const float
ticker = syminfo.ticker          // simple string
band = ta.sma(close, length) * factor // series float
emit "band" band
```

### `const`

Fixed during compilation: literals, `const` declarations, built-in constants
such as `color.red` and `math.pi`, enum members, and operators applied to
these.

Output names and some built-in parameters, such as `input.*` defaults, need the
value itself during compilation. Literals and constants provide it, and so do
operators, `int()`, `float()`, `color.new()`, `color.rgb()` and the `math.*`
functions applied to them. Other calls, including calls to functions you
wrote, can return a `const` value without providing it, so
`emit (str.tostring(1)) x` is an error.

### `input`

Fixed when the host binds the script, before execution starts. Most
`input.*()` functions declare a setting the host can change and return an
`input` value; `input.source()` and `input.series()` read a column of the input
data and return `series` values. See [input](../builtins/input.md).

### `simple`

Fixed before the first step, from the context the script runs in, such as
`syminfo.ticker` and `timeframe.period`.

### `series`

May differ on every step. Market data such as `close`, values computed from a
`series` operand, `var` and `varip` variables, history reads, and the results
of control structures, struct construction, field reads and method calls are
`series`.

### Qualifiers in annotations

A qualifier is written only in a parameter annotation, before the type:
`simple int length`. It is a cap: the argument may be at most that variable.
Variable declarations, fields and method results take no qualifier. `const` at
the start of a declaration is the [`const` declaration](./declarations.md#const),
which also gives the variable the `const` qualifier.

```tea
smoothed(float source, simple int length) => ta.sma(source, length)

length = input.int(10, "Length")
emit "smoothed" smoothed(close, length)
```

Passing `bar_index` as `length` is an error, because a `series` value cannot
be used where at most `simple` is accepted.

### Result qualifiers

- Operators and `?:` give the most variable qualifier of their operands,
  including the condition.
- Most built-in functions return the most variable qualifier of their
  arguments; some have a fixed one, as `input.int()` returns `input`.
- A call to a function you wrote has the most variable qualifier among the
  statements of its body, with each parameter taking its argument's qualifier.
  So the same function can return `const` for constant arguments and `series`
  for `close`.
- Method calls, `Name.new()`, field reads, history reads, `if`, `switch` and
  loops are `series`.
- A plain variable takes its initializer's qualifier. It is `series` if it is
  reassigned, or its collection updated, anywhere, and a variable declared with
  `var` or `varip` is always `series`. A `const` declaration is `const`.
- Names declared by destructuring a tuple all take the most variable qualifier
  of the whole tuple: after `[a, b] = [2, close]`, `a` is a `series int`.
