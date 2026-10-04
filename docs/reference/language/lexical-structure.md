---
title: Lexical structure
description: How Tea source text forms comments, lines, blocks, names, keywords and literals.
---

These rules decide how the compiler reads source text before it looks at what
the program means: comments, how lines and indentation form statements and
blocks, which words are keywords, and how literal values are written.

## Source files

Tea source files use the `.tea` extension; an [import](./declarations.md#import-and-as)
names a file without it. A file whose first statement is `library("name")` is a
library; any other file is an entry script, which may start with an
`indicator()` header. See [headers](./declarations.md#library-and-indicator-headers).

Lines may end with `\n` or `\r\n`.

### `//@version`

```text
//@version=1
```

A line comment of this form declares the Tea language version of the file. The
compiler records the number with the compiled program; it does not select a
different grammar or change how the program runs. The current version is `1`.

- The first `//@version=` comment in the file counts; later ones are ignored.
  It may appear on any line; by convention it is the first.
- Spaces around `=` are accepted: `//@version = 1`. The comment must start
  exactly with `//@version`, so `// @version=1` is an ordinary comment.
- Without the annotation, or when the value is not a number, the version is `1`.
- It is still a comment and produces no value.

```tea
//@version=1

emit "price" close
```

## Comments

### `//`

A line comment runs from `//` to the end of the line. It may follow code or
stand on its own line. A line that holds only a comment does not open or close
a block.

### `/* */`

A block comment runs from `/*` to the next `*/`. Block comments do not nest, and
an unterminated one is an error.

- Inside a line, a block comment separates tokens like a space:
  `x = 1 /* note */ + 2`.
- A block comment that contains a line break ends the statement it interrupts,
  as a line break would.
- When a line begins with a block comment, the code after it on that line
  continues the previous statement. Put a comment that precedes a statement on
  its own line.

```tea
/* Average of the bar's range,
   used as a volatility measure. */
barRange = high - low
emit "range" barRange // the range of the current bar
```

### `/** */`

A block comment that starts with `/**` is a documentation comment. The
compiler treats it as an ordinary block comment; the editor and the reference
read it.

- In the editor, hover, completion and signature help show the doc comment
  directly above a function, type, enum, interface, field, method, enum member
  or top-level variable, in your own scripts too, exported or not. Parameters
  and local variables get none.
- The [built-in](../builtins/core.md) and [library](../libraries/trade.md)
  reference pages are generated from the doc comments of the libraries that
  ship with Tea: the `library(...)` header, exported declarations, and the
  members of exported types and enums. Comments in your own scripts never
  appear in the reference.
- A doc comment documents the declaration on the line directly below it. Its
  closing `*/` ends its line, and nothing separates it from the declaration.
  A `*` at the start of each inner line is optional.
- The first paragraph is the summary; later paragraphs are Markdown.
- Tags follow the prose: `@param name text`, `@returns text`,
  `@formula` (TeX), `@warmup`, `@example`, `@pine`, `@see name` and
  `@category Name`. `{@link name}` links to another documented name.

```tea
/** Helpers for price bands. */
library("bands")

/**
 * Returns the midpoint between two prices.
 *
 * @param upper Upper price.
 * @param lower Lower price.
 * @returns The average of `upper` and `lower`.
 * @category Bands
 */
export midpoint(float upper, float lower) => (upper + lower) / 2
```

## Lines and blocks

### Statements

A statement ends at the end of its line, unless the line is continued. Simple
statements (declarations, assignments and expressions) may share a line,
separated by commas. A statement that ends with an indented block cannot be
followed by a comma.

```tea
lower = 1, upper = 2
emit "sum" lower + upper
```

### Indentation and blocks

A block is the run of lines indented deeper than the line that opens it.
Blocks follow `if`, `else`, `for`, `while` and `switch` headers, a function or
method whose `=>` ends its line, and `struct`, `type`, `interface` and `enum`
declarations.

- Indentation is counted in columns, and a tab counts as 4. A statement line is
  indented by a multiple of 4 columns; a block's lines are indented deeper than
  the line that opens the block.
- A line indented by a number of columns that is not a multiple of 4 does not
  start a statement: it continues the previous line.
- Returning to a shallower indentation closes every deeper block. The new
  indentation must match an enclosing level.
- The leading whitespace of one line cannot mix tabs and spaces. Different
  lines may use different characters when their column counts line up.
- Blank lines and comment-only lines never open or close a block.
- Top-level statements start in the first column.

```tea
count = 0
for i = 1 to 3
    if i > 1
        count += i
emit "count" count // 5
```

### Line continuation

A statement can span lines in two ways:

- Inside unclosed parentheses or brackets, line breaks and indentation are
  ignored until the closing `)` or `]`.
- A line indented by a number of columns that is not a multiple of 4 continues
  the previous line. A line indented by a multiple of 4 always starts a new
  statement, even when the previous line ends with an operator.

```tea
total = 1 +
  2 +
  3
average = math.avg(
    total,
    6)
emit "average" average // 6
```

## Names

A name starts with an ASCII letter or `_`, followed by letters, digits and `_`:
`price`, `_count`, `fast2`. Names are case-sensitive.

- A name cannot be a reserved keyword or one of the word operators `and`, `or`
  and `not`.
- Built-in names such as `close`, `ta`, `math`, `plot`, `true` and `na` cannot
  be declared again or assigned.
- A dotted spelling such as `ta.sma` or `color.red` is
  [member access](./expressions.md), not one name.

## Keywords

| Kind       | Keywords                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Reserved   | `var` `varip` `const` `if` `else` `for` `while` `switch` `break` `continue` `return` `emit` `this` |
| Contextual | `to` `by` `in` `import` `as` `export` `struct` `type` `interface` `enum`                           |

A reserved keyword is never a name. A contextual keyword is a keyword only
where its construct expects it, and an ordinary name everywhere else:

- `to` and `by` inside a `for` header, and `in` in a `for … in` loop;
- `import` and `as` in an import;
- `export` before a library declaration;
- `struct`, `type`, `interface` and `enum` when a type declaration follows.

So `type = 1` declares a variable named `type`. `append` is a keyword only
directly after `emit.`, as in `emit.append`.

## Operators and punctuation

| Symbols                       | Use                                                   |
| ----------------------------- | ----------------------------------------------------- |
| `+` `-` `*` `/` `%`           | Arithmetic and string concatenation                   |
| `==` `!=` `<` `<=` `>` `>=`   | Comparison                                            |
| `and` `or` `not`              | Logic                                                 |
| `?` `:`                       | Conditional expression                                |
| `[` `]`                       | History, tuples, tuple patterns and `T[]` array types |
| `.`                           | Member access                                         |
| `(` `)`                       | Grouping and calls                                    |
| `=`                           | Declaration                                           |
| `:=` `+=` `-=` `*=` `/=` `%=` | Reassignment                                          |
| `=>`                          | Function, method and `switch` arm bodies              |
| `,`                           | Separates arguments, elements and simple statements   |
| `:`                           | Separates a type parameter from its constraint        |

`!` is valid only as part of `!=`. [Expressions and operators](./expressions.md)
covers what each operator does and how tightly it binds;
[Declarations](./declarations.md) covers `=`, `:=` and the compound forms.

## Literals

### Numbers

```text
42    007    1.5    .5    2.    1e3    2.5E-3
```

- A literal of digits only is an `int`. A literal with a `.` or an exponent is
  a `float`.
- Digits are decimal, and leading zeros do not change the base. There are no
  digit separators, hexadecimal forms or signs: `-5` applies unary `-` to `5`.
- An exponent needs digits: `1e` is an error.
- Numbers are 64-bit floating-point values, so integers above 2⁵³ lose
  precision, and a literal too large to represent, such as `1e400`, is `na`.

### Strings

- A string is enclosed in `"` or `'`, and the same quote closes it on the same
  line. There are no multi-line string literals.
- `\n` is a line break and `\t` a tab. A backslash before any other character
  produces that character, so `\"`, `\'` and `\\` give `"`, `'` and `\`. There
  are no other escapes: `\u0041` is `u0041`.

```tea
quoted = "say \"hi\""
apostrophe = 'it\'s'
emit "text" quoted + "\n" + apostrophe
```

### Colors

- A color literal is `#RRGGBB` or `#RRGGBBAA`: exactly 6 or 8 hexadecimal
  digits, in either case.
- `AA` is opacity: `FF` is opaque and `00` fully transparent. A 6-digit literal
  is opaque.
- Colors with the same channels are equal however they are written.

```tea
solid = #2962FF
faded = #2962FF80
emit "same" solid == #2962ffff // true
emit "faded" faded
```

### `true`, `false` and `na`

`true` and `false` are the two [`bool`](./types.md#bool) values. `na` is the
missing value; on its own it has no type, and the context supplies one (see
[`na`](./types.md#na)). These are built-in names rather than keywords, and they
cannot be declared again or assigned.

```tea
float lastPeak = na
ready = true
emit "waiting" na(lastPeak) and ready // true
```
