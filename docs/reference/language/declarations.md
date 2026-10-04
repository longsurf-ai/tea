---
title: Declarations
description: Variables and assignment, functions, struct and enum types, methods, interfaces, type parameters, imports, exports and headers.
---

A declaration introduces a name. A variable is visible from its declaration to
the end of the block that declares it, including nested blocks. Functions,
types, enums, interfaces and imports are declared at the top level, and their
names are visible throughout the file.

## Variables

### Declaration: `=`

```text
name = expression
Type name = expression
```

Declares a new variable in the current block and gives it the value of
`expression`. A plain declaration runs every time execution reaches it, so a
top-level declaration is computed again on every step.

- Without an annotation, the variable takes the initializer's type. An `na`
  initializer needs an annotation: `float level = na`.
- With an annotation, the initializer must convert to that type (see
  [conversions](./types.md#conversions)). Variable annotations take no
  [qualifier](./types.md#qualifiers-in-annotations).
- The initializer must have a value: a call that returns nothing, or an `if`
  whose branches have different types, is an error.
- A name can be declared once in a block. A nested block, loop or function may
  declare the same name again; the new variable hides the outer one until the
  block ends. Use `:=` to change the outer variable instead.
- Built-in names such as `close`, `ta`, `plot`, `color` and `true` cannot be
  declared.
- A `request.*` call must be the whole initializer of a plain top-level
  declaration; see [requests](../../requests.md).

```tea
spread = high - low
float lastPeak = na
array<float> closes = array.from(close)
emit "spread" spread
```

A declaration in a nested block hides the outer variable:

```tea
level = 1
if close > open
    level = 2
    emit "inner" level // 2
emit "outer" level     // 1
```

### `var`

```text
var name = expression
var Type name = expression
```

Initializes the variable once, the first time execution reaches the
declaration. On later steps the declaration is skipped and the variable keeps
its value; change it with `:=` or a collection update.

- A `var` variable is always `series`.
- Inside a function, each call written in the source has its own variable.
- If the initializer does not finish because it executes a `return`, the
  variable stays uninitialized and the initializer runs again the next time it
  is reached.
- On live data a row can run several times before it is confirmed. Each run
  starts from the variable's value confirmed on the previous row, so
  reassignments made by an unconfirmed run are discarded. Changes to the
  fields of a struct the variable refers to are kept.
- The initializer cannot call a function that executes `emit`, and `var`
  cannot destructure a tuple.

```tea
var int count = 0
if close > open
    count += 1
emit "upCloses" count
```

The [memory model](../../memory-model.md#transactions-realtime-var-and-varip)
defines persistence on live rows in full.

### `varip`

```text
varip name = expression
varip Type name = expression
```

Like [`var`](#var), except that values assigned during an unconfirmed run of a
row are kept for the next run instead of being discarded. Use it to count or
accumulate the updates within one live row.

```tea
varip int updates = 0
updates += 1
emit "updates" updates
```

### `const`

```text
const name = expression
const Type name = expression
```

Declares a value fixed during compilation. The initializer must be a
compile-time constant: literals, other constants, built-in constants such as
`color.red`, enum members, and operators applied to them (see
[`const`](./types.md#const)).

- A `const` variable cannot be reassigned and has no history: `length[1]` is
  an error.
- Its value can be used where a compile-time value is required, such as an
  output name or an `input.*` default.

```tea
const string prefix = "band"
const int length = 20
emit (prefix + ".upper") ta.sma(high, length)
```

### Tuple destructuring

```text
[name1, name2, ...] = expression
```

Declares one variable for each element of a tuple: the value of a function or
block that ends in `[a, b]`, a tuple literal, or an `if`, `switch` or loop
whose body ends in tuples.

- The number of names must equal the number of elements.
- A tuple cannot be kept in one variable: with a tuple-valued `f`, `pair = f()`
  is an error.
- `var`, `varip` and `const` cannot destructure, and destructured names cannot
  be reassigned together with `:=`.

```tea
bounds(float a, float b) => [math.min(a, b), math.max(a, b)]

[bottom, top] = bounds(open, close)
emit "bottom" bottom
emit "top" top
```

### Reassignment: `:=`

```text
target := expression
```

Gives an existing variable or struct field a new value.

- `target` is a variable declared earlier in this block or an enclosing one,
  or a field: `point.x`, `this.x`.
- The value must convert to the target's type.
- `const` variables, built-in names and undeclared names cannot be assigned.
  `values[0] := x` is an error, because `values[0]` is a
  [history](./expressions.md) read; use `values.set(0, x)`.
- Inside a function or method, variables declared outside it cannot be
  reassigned, except that a library's functions may update the library's own
  `var` variables. Fields of structs reached through outside variables can be
  assigned.
- A variable that is reassigned anywhere is `series`.
- Assigning a struct value rebinds the variable to that reference; it does not
  copy fields.
- As the last statement of a block, an assignment gives the block its value.

```tea
dir = 0
dir := close > open ? 1 : -1
emit "dir" dir
```

### Compound assignment: `+=` `-=` `*=` `/=` `%=`

`target op= value` is `target := target op value`, using the
[arithmetic](./expressions.md) rules: an `int` target needs an `int` result
(`count += 1.5` is an error), `/=` on an `int` truncates, and `+=` on a
`string` concatenates.

```tea
var float total = 0.0
total += close - open
var string trail = ""
trail += close > open ? "+" : "-"
emit "total" total
emit "trail" trail
```

## Functions

### Function declarations: `=>`

```text
name(parameters) => expression

name(parameters) =>
    statements
    result
```

- Functions are declared at the top level of a file and are visible
  throughout it, including above the declaration.
- The body is one expression, or an indented block whose value is the value of
  its last statement. [`return`](./control-flow.md#return) leaves earlier.
- The result type is inferred and cannot be written. Every `return` value and
  the final value must share a type (`int` and `float` give `float`); a
  function cannot return a value on one path and none on another.
- A function reads variables declared outside it but cannot reassign them or
  update collections stored in them; in a library, functions may update the
  library's own `var` variables. A function can change fields of structs it
  reaches.
- A function cannot call itself, directly or through other functions.
- A function is not a value: it can only be called.
- State belongs to the call as written. Each call in the source has its own
  `var` variables and its own history of the function's parameters and locals.

```tea
spreadRatio(float a, float b) =>
    gap = math.abs(a - b)
    gap / math.max(a, b)

emit "ratio" spreadRatio(high, low)
```

```tea
counter() =>
    var int calls = 0
    calls += 1
    calls

first = counter()
second = counter()
emit "first" first   // 1, 2, 3, ...
emit "second" second // also 1, 2, 3, ...
```

### Parameters

```text
name
Type name
qualifier Type name
... = default
```

- A typed parameter converts its argument to that type and rejects arguments
  that do not convert. An untyped parameter takes the argument's type. An `na`
  argument needs a typed parameter.
- The body is checked for each different combination of argument types,
  qualifiers and constant values the function is called with. The body of a
  function that is never called is not checked, even when every parameter has
  a type: errors in it are reported only once a call to it is written.
- A [qualifier](./types.md#qualifiers-in-annotations) caps how variable the
  argument may be: `simple int length` rejects a `series` argument. A
  qualifier needs a type after it.
- `= default` makes the parameter optional. The default is evaluated for each
  call that omits the argument, and may use earlier parameters and variables
  declared outside the function.
- Parameter names are unique within one declaration.
- A parameter is a local variable: the body may reassign it without affecting
  the caller. It keeps its argument's qualifier, so a constant string argument
  can be forwarded to `emit`.

```tea
scaled(float value, simple float factor = 2.0) => value * factor

emit "double" scaled(close)
emit "triple" scaled(close, factor = 3.0)
```

Calls pass arguments by position, then by name; see
[calls](./expressions.md).

## `struct` and `type`

```text
struct Name
    Type field
    Type field = default
    ResultType method(Type param) => body
```

`struct Name` and the block form `type Name` declare the same kind of type; the
two keywords are interchangeable. A struct is a nominal reference type:
assigning a struct value copies the reference, so every copy sees the same
fields. See the [memory model](../../memory-model.md#structs).

- Types are declared at the top level. Their names are visible throughout the
  file, so fields can refer to types declared later and to the type itself.
- Fields and methods may be interleaved and share one namespace.
- Structs have no `==`; test for a missing reference with `na(x)`.
- In a library, `export struct Name` makes the type, its fields and its
  methods available to importers.

### Fields

```text
Type name
Type name = default
```

- One field per line. Fields take no qualifier and no `var` or `varip`:
  persistence belongs to the variable that holds the struct.
- A field may hold the struct's own type, directly or through other types and
  collections. Such a recursive type cannot be [emitted](./outputs.md).
- A default is evaluated each time a constructor omits the field. It may read
  variables and constants declared outside the type, but not other fields or
  `this`. It can construct a type, or name an enum member, only when that type
  or enum is declared above this one.

```tea
struct Node
    int value
    Node next = na

head = Node.new(1, Node.new(2))
emit "second" head.next.value // 2
```

### Construction: `.new()`

```text
Name.new(value, ..., field = value)
```

- Positional arguments fill fields in declaration order; methods do not
  count. Named arguments set fields by name.
- Every field without a default must be given.
- Each call creates a new object. The result is `series`.
- `Name(...)` without `.new` is an error. An imported type is constructed with
  `pkg.Name.new(...)`.
- A type can be constructed only below its declaration.

```tea
struct Point
    float x
    float y = 0.0

origin = Point.new(0.0)
p = Point.new(y = 2.0, x = 1.0)
p.x := 3.0
emit "x" p.x            // 3
emit "originY" origin.y // 0
```

### Methods

```text
ResultType name(Type param, ...) => body
ResultType name(Type param, ...) const => body
```

A method is declared inside a struct body and called as
`value.name(arguments)` on any value of that type: a variable, a field, a
collection element or a history read.

- The result type is required; `void` declares a method without a value.
  Every parameter needs a type, and may have a qualifier and a default.
- `this` is the value the method was called on.
- A `void` method's body must not end with a value. An assignment produces
  one, so end such a body with a bare `return`.
- Defaults are evaluated where the type is declared: they may read variables
  declared outside the type, but not `this` or other parameters.
- Method bodies follow the same rules as function bodies, and are checked even
  when the method is never called.
- Through an `na` reference, a mutable method stops the run with a runtime
  error; a `const` method reads empty field values.
- A method call's result is `series`.

```tea
struct Counter
    int value = 0

    int add(int amount) =>
        this.value += amount
        this.value

    int read() const => this.value

    void reset() =>
        this.value := 0
        return

counter = Counter.new()
counter.add(2)
emit "value" counter.read() // 2
```

### `this`

Inside a method, `this` refers to the receiver. It is used only to select a
field or method, as in `this.value` or `this.add(1)`; a bare `this` cannot be
stored, returned, passed or compared. `this` is a reserved keyword and is an
error outside a method.

### `const` methods

A trailing `const` makes the receiver read-only, shallowly. The method cannot
assign a field of `this`, update a collection stored in a field of `this`, or
call a mutable method on `this`. It can change other structs that `this`
refers to, through their own fields and methods.

```tea
struct Account
    float cash
    array<float> fills

    void record(float price) =>
        this.fills.push(price)

    float balance() const => this.cash

account = Account.new(100.0, array.new<float>())
account.record(close)
emit "fills" account.fills.size() // 1
emit "cash" account.balance()     // 100
```

### `type Name = Target`

Tea has no type aliases. `type Name = Target` is reported as an error:
`type aliases are not supported yet`.

## `enum`

```text
enum Name
    member
    member = "Title"
```

Declares a nominal type with a fixed set of members.

- Enums are declared at the top level. A member is written `Name.member`, or
  `pkg.Name.member` for an imported enum, and is a `const` value.
- A title is a constant string; without one, the title is the member's name.
  `str.tostring(value)` returns the title, an output column holds the member
  name, and `input.enum()` passes the titles to the host.
- Members compare with `==` and `!=`. Values of different enum types cannot be
  compared.
- Members can be used only below the declaration; the type name can appear in
  annotations anywhere in the file. Member names are unique within one enum.

```tea
enum Side
    long = "Long"
    short = "Short"
    flat

side = close > open ? Side.long : Side.short
emit "title" str.tostring(side) // "Long" or "Short"
emit "isLong" side == Side.long
```

## `interface`

```text
interface Name
    ResultType method(Type param, ...)
    ResultType method(Type param, ...) const
```

Declares a set of method signatures. An interface has no fields, bodies or
parameter defaults, and may be empty.

- Interfaces are declared at the top level, and exported with
  `export interface` from a library.
- An interface is not a value type: it cannot annotate a variable or
  parameter, be constructed or be called. Its use is to constrain
  [type parameters](#type-parameters).
- A struct satisfies an interface when, for every method the interface lists,
  it has a method of that name with the same parameter types and qualifiers,
  the same result type and the same receiver mode (`const` or not). Parameter
  names may differ, extra methods are allowed, and nothing declares the
  relationship. An empty interface is satisfied by every struct.

## Type parameters

```text
struct Name<T: Interface, U: Interface>
type Name<T: Interface>
```

A struct type can take type parameters; functions, methods and interfaces
cannot.

- Every type parameter has a constraint: an interface declared in this file,
  or `pkg.Interface` from an import.
- Inside the type, `T` can be used in field types, method signatures and
  bodies. A value of type `T` can call only the methods its constraint lists.
- A type argument is a struct that satisfies the constraint. `Name.new(...)`
  infers the arguments from the fields it is given; an annotation, such as the
  type of a variable, field or function parameter, writes them explicitly, as
  `Name<Source>`. `Name.new<Source>(...)` is an error.
- Each different list of type arguments makes a different type, named like
  `Name<Source>`.

```tea
interface Reader
    float read() const

struct Constant
    float value
    float read() const => this.value

struct Doubler<T: Reader>
    T source
    float read() const => this.source.read() * 2

Doubler<Constant> doubled = Doubler.new(Constant.new(1.5))
emit "value" doubled.read() // 3

quadruple(Doubler<Constant> source) => source.read() * 2

emit "quadrupled" quadruple(doubled) // 6
```

## Imports and exports

### `import` and `as`

```text
import name
import name as alias
import ./relative/path
import ../relative/path as alias
```

- A single bare name imports a library that ships with Tea, such as
  [`trade`](../libraries/trade.md). `ta` is available as `ta` without an
  import.
- A path that starts with `./` or `../` imports the `.tea` file at that path,
  relative to the importing file. The file must begin with a `library(...)`
  header.
- A bare path with several segments, such as `owner/name/1`, is reported as
  unsupported.
- The library's exports are reached through a namespace: the name in its
  `library("...")` header, or `alias` when `as alias` is written.
- Imports are written at the top level.

```tea
import ta as indicators

emit "average" indicators.sma(close, 3)
```

[Imports](../../imports.md) defines path resolution and loading.

### `export`

```text
export name(parameters) => body
export struct Name
export type Name
export enum Name
export interface Name
export name = input.series("column")
export name = expression
```

`export` makes a library's declaration available to files that import it.
Everything else in a library stays private to it, including its `const`
values and `var` variables.

- Exporting a struct exports its fields and methods; exporting an enum exports
  its members.
- `export name = input.series("column")` publishes an input alias: a
  `series float` read from the input column of that name, as `close` is.
- `export name = expression` publishes a value computed on every bar, as
  `ta.obv` is. A script that reads it computes it once per bar, before its own
  statements, so every read agrees, including a read inside an `if` and a
  history read such as `ta.obv[1]`. The expression may read market data and
  call functions that keep state; it cannot emit, make a request or change
  other state, and nothing may assign the exported name.
- An exported function cannot call `input.*`.
- `export` is a contextual keyword: `export = 1` declares a variable named
  `export`.

### `library` and `indicator` headers

```text
library("name")
indicator("Title", overlay = true)
```

- `library("name")` makes the file a library. It is the first statement, written
  once, and `name` must be a valid name that is not a reserved keyword. The top
  level of a library may contain only imports, function, type, enum and
  interface declarations, `const` declarations, private `var` declarations
  with one name and a type annotation, exported input aliases, and exported
  values computed on every bar.
- `indicator("Title")` describes an entry script to its host: a title and
  whether to draw over the price chart. It is optional; when present it is the
  first statement, written once, with literal arguments and a non-empty title.
  It does not change how the script runs. Libraries cannot declare it.

```tea
/** Price band helpers. */
library("bands")

const float defaultWidth = 2.0

export enum Edge
    upper
    lower

export band(float center, float width = defaultWidth) => [center - width, center + width]
```

```tea
indicator("Range", overlay = false)

emit "range" high - low
```

See [core functions](../builtins/core.md) for both headers' parameters.
