// Purpose: Reader-facing documentation for every native function and value in the catalog, keyed by catalog name.

// Signatures, parameter types, qualifiers and constant values stay in
// catalog.ts; this file adds only what a reader needs to know beyond them.
// The reference tests fail when a catalog name, a supported parameter, or a
// constant lacks documentation here, and they compile every example; the
// reference generator runs each one and shows what it writes.

import type {DocExample} from '../syntax/doc-comments';

/** Documentation for one native function name, shared by all its overloads. */
export interface NativeFunctionDoc {
  /** One sentence, shown in summary tables. */
  readonly summary: string;
  /** Every supported parameter of every overload, by parameter name. */
  readonly params: Readonly<Record<string, string>>;
  /** What the call produces, including when it is `na`. Omit for no result. */
  readonly returns?: string;
  /** Further Markdown paragraphs. */
  readonly details?: string;
  /** TeX for one display-math block, without `$` delimiters. */
  readonly formula?: string;
  /** When the result is `na` at the start, and how `na` arguments propagate. */
  readonly warmup?: string;
  /** Complete programs the reference runs; build each with `example()`. */
  readonly examples?: readonly DocExample[];
  /** A difference from Pine Script v6 that remains. */
  readonly pine?: string;
  /** Related documented names. */
  readonly see?: readonly string[];
  /** The section of its reference page. */
  readonly category: string;
}

/**
 * Documentation for one native value, or for a family of constants when the
 * key ends with `*` (`color.*` covers every `color.` constant).
 */
export interface NativeValueDoc {
  /** One sentence, shown in summary tables. */
  readonly summary: string;
  /** Further Markdown paragraphs. */
  readonly details?: string;
  /** Complete programs the reference runs; build each with `example()`. */
  readonly examples?: readonly DocExample[];
  /** A difference from Pine Script v6 that remains. */
  readonly pine?: string;
  /** Related documented names. */
  readonly see?: readonly string[];
  /** The section of its reference page. */
  readonly category: string;
  /** For a family: notes on individual constants, by full name. */
  readonly members?: Readonly<Record<string, string>>;
}

function lines(...source: string[]): string {
  return source.join('\n');
}

/** A program `details` shows without running it, such as one that needs request data. */
function program(source: string): string {
  return `\`\`\`tea\n${source}\n\`\`\``;
}

/** An example: a caption, a program, and the CSV it runs on, if it reads any. */
function example(
  caption: string,
  source: string,
  csv: string | null = null,
): DocExample {
  return {caption, source, csv};
}

// Example inputs shared by many entries: small round prices whose results
// are easy to check by hand.
const CLOSES = lines(
  'time,close',
  '0,9',
  '1,12',
  '2,12',
  '3,15',
  '4,12',
  '5,18',
);
const OPENS_AND_CLOSES = lines(
  'time,open,close',
  '0,10,9',
  '1,9,12',
  '2,12,12',
  '3,12,15',
  '4,15,12',
  '5,12,18',
);

// The input page shows these parameters once, so every input function must
// describe them with exactly the same text.
const INPUT_TITLE = 'The label a host shows for the input.';
const INPUT_TOOLTIP = 'Help text a host shows with the input.';
const INPUT_INLINE =
  'A host shows inputs that have the same `inline` text on one line.';
const INPUT_GROUP =
  'A host shows inputs that have the same `group` text together, under that text as a heading.';
const INPUT_CONFIRM =
  'When `true`, asks a host to have the user confirm the value before the script runs.';
const INPUT_DISPLAY =
  'Where a host shows the input’s value: {@link display.all}, {@link display.data_window}, {@link display.status_line} or {@link display.none}; the other `display` constants are rejected. The default is `display.all` unless the entry says otherwise.';
const INPUT_ACTIVE =
  'Whether a host shows the input as enabled. It is evaluated when the script is bound and may read other inputs; it never changes the input’s value.';

const INPUT_DEFAULT = 'The value used when the host supplies none.';
const INPUT_RESULT =
  'The value the host supplied, or the default; it is the same on every bar.';
const HIDDEN_BY_DEFAULT = 'Its value is hidden by default (`display.none`).';
const NUMBER_OPTIONS =
  'The only values the host may supply, as a bracketed list of distinct constants such as `[5, 10, 20]`; the default must be one of them.';
const NUMBER_RULES =
  'A value below `minval`, above `maxval` or missing from `options` is rejected when the host binds the script; `step` only guides a host’s control and is not enforced. The default must meet the same limits, `minval` cannot exceed `maxval`, and `step` must be greater than zero. `options` replaces the range arguments and cannot be combined with them.';

function textOptions(example: string): string {
  return `The only values the host may supply, as a bracketed list of distinct constants such as \`${example}\`; the default must be one of them. Without it, any text is accepted.`;
}

const REQUEST_SYMBOL =
  'The symbol of the requested data, recorded for the host, which binds the matching data stream. It must be known when the script is bound: a constant, an input, or a fixed value such as {@link syminfo.tickerid}. If it reads a `syminfo` value the host has not supplied, the script cannot start.';
const REQUEST_TIMEFRAME =
  'The timeframe of the requested data, such as `"60"` (60 minutes) or `"D"` (one day). Like `symbol`, it must be known when the script is bound. Tea fetches nothing for it; when the stream the host binds declares a regular period that differs, such as hourly data for `"D"`, the script cannot start.';
const REQUEST_EXPRESSION =
  'The calculation to run on the requested data, with that data’s own bars and history. It must produce one `int`, `float`, `bool`, `string`, `color` or enum value. It may read the script’s constants and inputs, except source inputs and inputs named by their position (see {@link input}), but no other script variables; call a function to use several statements. An input it reads is the request’s own copy, which the host sets separately: a value set for the script does not reach it.';
function requestPlacement(declaration: string): string {
  return `The call must be the entire initializer of a top-level variable declared without \`var\` or \`varip\`, such as \`${declaration}\`. The host binds the requested data stream under that variable’s name; Tea fetches no data itself.`;
}
const REQUEST_CONTEXT =
  'Inside `expression`, `syminfo` and `timeframe` values are the ones the host supplies for that request, and `na` or `false` without them; Tea does not set them from `symbol` and `timeframe`, and the script’s own values do not reach them.';
const REQUEST_LATE =
  'a requested value that arrives after the bar it belongs to has been finalized stops the run with an error';

const ARRAY_SELF = 'The array.';
const ARRAY_UPDATED = 'The array to update.';
const MATRIX_SELF = 'The matrix.';
const MATRIX_UPDATED = 'The matrix to update.';
const MAP_SELF = 'The map.';
const MAP_UPDATED = 'The map to update.';
const LIMIT = 'A collection holds at most 100,000 elements';
const EMPTY_VALUE = 'empty value (`na`, or `false` for `bool`)';
/** The per-bar allocation budget every collection change counts against. */
function allocationBudget(call: string, exampleLimit: string): string {
  return `Each \`${call}\`, like every change to a collection, copies the whole collection into new storage. One bar may allocate at most 10,000 times and 16 MiB in all, where each copy counts 16 bytes plus 8 for each number, bool, string or color it holds; past either limit the run stops with \`HEAP_LIMIT_EXCEEDED\`. So ${exampleLimit}.`;
}
const ALLOCATIONS_LINK =
  'Each change copies the collection and counts against a per-bar allocation budget';

const SYMBOL_IN_REQUEST =
  'Inside a request expression it is the value the host supplies for that request, or `na`; Tea does not take it from the request’s `symbol` or from the script.';
const TIMEFRAME_IN_REQUEST =
  'Inside a request expression it is the value the host supplies for that request, or `na`; Tea does not take it from the request’s `timeframe` or from the script.';
const FLAG_FROM_HOST =
  'The host supplies it separately; Tea does not derive it from {@link timeframe.period}. Inside a request expression it is the value the host supplies for that request, or `false`; Tea does not take it from the request’s `timeframe` or from the script.';

export const NATIVE_FUNCTION_DOCS: Readonly<Record<string, NativeFunctionDoc>> =
  {
    // ---- core ---------------------------------------------------------------
    library: {
      summary: 'Declares a file as a library and names it.',
      params: {
        title:
          'The library’s name, which importing scripts use as its namespace. It must be an identifier: letters, digits and underscores, not starting with a digit, and not a keyword.',
      },
      details: [
        'It must be the file’s first statement and appear only once. A script that imports the file uses this name unless it renames the import with `as`. See [Imports](/imports).',
        program(
          lines(
            'library("bands")',
            '',
            'export upper(float source, float width) => source + width',
          ),
        ),
      ].join('\n\n'),
      category: 'Script declarations',
    },
    indicator: {
      summary:
        'Declares the script’s title and whether a host draws it over the price chart.',
      params: {
        title: 'The name a host shows for the script. It cannot be empty.',
        overlay:
          '`true` to draw the script’s outputs over the price chart; `false`, the default, to draw them in a separate pane. Pass it by name, as `overlay = true`: the second position belongs to `shorttitle`, which Tea does not accept yet, so `indicator("X", true)` is an error.',
      },
      details:
        'It must be the script’s first statement and appear at most once, and a library cannot declare it. The header only informs the host; it never changes how the script runs.',
      examples: [
        example(
          'The header changes nothing in the output: `range` is `high - low` on every bar, from 2 on bar 0 to 5 on bar 5.',
          lines(
            'indicator("Bar range", overlay = false)',
            'emit "high" high',
            'emit "low" low',
            'emit "range" high - low',
          ),
          lines(
            'time,high,low',
            '0,10,8',
            '1,12,9',
            '2,11,7',
            '3,13,9',
            '4,12,8',
            '5,15,10',
          ),
        ),
      ],
      category: 'Script declarations',
    },
    na: {
      summary: 'Tests whether a value is missing.',
      params: {
        x: 'The value to test. It can have any type except `bool`, which is never missing.',
      },
      returns: '`true` when `x` is `na`, otherwise `false`.',
      details:
        'Every comparison involving a missing value is `false`, even `!=`, and `x == na` is a compile error, so test with `na(x)`. Arithmetic without a defined result, such as division by zero or the square root of a negative number, gives `na`. An `na` array, matrix or map is no collection at all, unlike an empty one, and an `na` struct refers to no struct.',
      examples: [
        example(
          'Bar 0 has no previous close, so `previous` is `na` and `missing` is `true` there; on every later bar `missing` is `false`.',
          lines(
            'previous = close[1]',
            'emit "close" close',
            'emit "previous" previous',
            'emit "missing" na(previous)',
          ),
          CLOSES,
        ),
      ],
      see: ['nz'],
      category: 'Missing values',
    },
    nz: {
      summary: 'Replaces a missing value with a fallback.',
      params: {
        source: 'The value to check.',
        replacement:
          'The value to use when `source` is `na`. Without it, the fallback is `0` for numbers and fully transparent black (`#00000000`) for colors.',
      },
      returns: '`source` when it is not `na`, otherwise the replacement.',
      examples: [
        example(
          'On bar 0, `change` is `na`: `filled` replaces it with 0, and `previous` falls back to that bar’s own close, 9.',
          lines(
            'change = close - close[1]',
            'emit "close" close',
            'emit "change" change',
            'emit "filled" nz(change)',
            'emit "previous" nz(close[1], close)',
          ),
          CLOSES,
        ),
      ],
      see: ['na'],
      category: 'Missing values',
    },
    int: {
      summary:
        'Converts a number to an integer by dropping its fractional part.',
      params: {x: 'The number to convert.'},
      returns:
        '`x` truncated toward zero, so `int(-2.7)` is `-2`; `na` when `x` is `na`.',
      examples: [
        example(
          '`int` drops the fraction toward zero, so `negative` is `-2`, while `math.round(-2.7)` is `-3`.',
          lines(
            'emit "positive" int(2.7)',
            'emit "negative" int(-2.7)',
            'emit "rounded" math.round(-2.7)',
          ),
        ),
      ],
      see: ['math.round', 'math.floor', 'float'],
      category: 'Conversions',
    },
    float: {
      summary: 'Converts a number to a `float`.',
      params: {x: 'The number to convert.'},
      returns: '`x` as a `float`; `na` when `x` is `na`.',
      details:
        'Dividing one `int` by another truncates, so convert one of them to keep the fraction. `float(na)` is a missing value of type `float`; use it where a bare `na` has no type, such as a request expression.',
      examples: [
        example(
          'Both operands of `7 / 2` are `int`, so `ints` is truncated to 3; converting one to `float` keeps the fraction.',
          lines('emit "ints" 7 / 2', 'emit "floats" float(7) / 2'),
        ),
      ],
      see: ['int'],
      category: 'Conversions',
    },
    'str.tostring': {
      summary: 'Converts a value to text.',
      params: {value: 'The value to convert.'},
      returns: 'The text form of `value`; `"NaN"` when `value` is `na`.',
      details:
        'Numbers use the shortest form that reads back as the same number: `3.0` gives `"3"`, `0.1 + 0.2` gives `"0.30000000000000004"`, and very large or small numbers use exponent notation such as `"1e+21"`. There is no format argument; round with {@link math.round} first to limit the decimals. A `string` is returned unchanged, a `bool` gives `"true"` or `"false"`, a color its hex code such as `"#FF5252"` (with two more digits when it is transparent), and an enum member its title, or its name when it has no title.',
      examples: [
        example(
          '`3.0` prints as `3`, the sum keeps every digit until `math.round` limits it, a transparent color gets two more hex digits for its opacity, and `na` prints as `NaN`.',
          lines(
            'emit "number" str.tostring(3.0)',
            'emit "sum" str.tostring(0.1 + 0.2)',
            'emit "rounded" str.tostring(math.round(0.1 + 0.2, 2))',
            'emit "flag" str.tostring(1 < 2)',
            'emit "color" str.tostring(color.new(color.red, 80))',
            'emit "missing" str.tostring(float(na))',
          ),
        ),
      ],
      pine: 'Tea has no `format` argument and does not convert arrays.',
      see: ['math.round'],
      category: 'Conversions',
    },
    'runtime.error': {
      summary: 'Stops the script with an error message.',
      params: {message: 'The error message.'},
      details: [
        'When a call runs, the run stops: no output is published for that bar or any later one, and the host receives the message.',
        'A call that runs every time its script or function runs is a compile error instead: one with no `if` around it, or only `if`s whose constant conditions select it. Constant arguments count as constants inside the function they are passed to, so `ta.sma(close, 0)` is rejected where it is written, even inside an `if`. A call inside a loop, inside a `switch`, or after a `return` that may run first is only checked when it runs.',
        'This script stops on its first bar when the host sets `length` below 2:',
        program(
          lines(
            'length = input.int(14)',
            'if length < 2',
            '    runtime.error("length must be at least 2")',
            'emit "average" ta.sma(close, length)',
          ),
        ),
      ].join('\n\n'),
      pine: 'A call that runs every time its script or function runs is rejected when the script compiles, instead of stopping the run.',
      category: 'Script control',
    },

    // ---- input ----------------------------------------------------------------
    'input.int': {
      summary: 'Declares a whole-number input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        minval: 'The smallest value the host may supply.',
        maxval: 'The largest value the host may supply.',
        step: 'The increment a host’s control uses between values.',
        options: NUMBER_OPTIONS,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: `${NUMBER_RULES} See {@link input} for how inputs are named and when they are fixed.`,
      examples: [
        example(
          'The host supplies no value, so `length` is its default, 3, and `average` is the mean of the last three closes from bar 2 on.',
          lines(
            'length = input.int(3, "Length", minval = 1, maxval = 200)',
            'emit "close" close',
            'emit "average" ta.sma(close, length)',
          ),
          CLOSES,
        ),
      ],
      see: ['input', 'input.float'],
      category: 'Numbers',
    },
    'input.float': {
      summary: 'Declares a floating-point number input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        minval: 'The smallest value the host may supply.',
        maxval: 'The largest value the host may supply.',
        step: 'The increment a host’s control uses between values.',
        options: NUMBER_OPTIONS,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: NUMBER_RULES,
      examples: [
        example(
          '`offset` is its default, 0.5, so `shifted` is each close plus 0.5.',
          lines(
            'offset = input.float(0.5, "Offset", minval = 0.0, step = 0.5)',
            'emit "close" close',
            'emit "shifted" close + offset',
          ),
          CLOSES,
        ),
      ],
      see: ['input.int'],
      category: 'Numbers',
    },
    'input.bool': {
      summary: 'Declares a true-or-false input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: HIDDEN_BY_DEFAULT,
      examples: [
        example(
          '`smooth` is `true` by default, so `value` is the 3-bar average rather than the close, and `na` until bar 2.',
          lines(
            'smooth = input.bool(true, "Smooth")',
            'average = ta.sma(close, 3)',
            'emit "close" close',
            'emit "value" smooth ? average : close',
          ),
          CLOSES,
        ),
      ],
      category: 'Text and choices',
    },
    'input.string': {
      summary:
        'Declares a text input, optionally limited to a list of choices.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        options: textOptions('["SMA", "EMA"]'),
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      examples: [
        example(
          '`kind` is its default, `"SMA"`, so `average` is the 3-bar simple average.',
          lines(
            'kind = input.string("SMA", "Average", options = ["SMA", "EMA"])',
            'sma = ta.sma(close, 3)',
            'ema = ta.ema(close, 3)',
            'emit "close" close',
            'emit "average" kind == "SMA" ? sma : ema',
          ),
          CLOSES,
        ),
      ],
      see: ['input.enum'],
      category: 'Text and choices',
    },
    'input.color': {
      summary: 'Declares a color input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: `A host supplies the color as \`#RRGGBB\` or \`#RRGGBBAA\` text. ${HIDDEN_BY_DEFAULT}`,
      examples: [
        example(
          'The host supplies no value, so `lineColor` is its default, `color.blue`, shown by its red, green, blue and opacity (`a`) channels.',
          lines(
            'lineColor = input.color(color.blue, "Line color")',
            'emit "line_color" lineColor',
          ),
        ),
      ],
      category: 'Colors, symbols and time',
    },
    'input.timeframe': {
      summary: 'Declares a text input that names a timeframe, such as `"D"`.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        options: textOptions('["60", "D", "W"]'),
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: [
        'Tea does not check that the text is a valid timeframe. A common use is the `timeframe` of {@link request.security}.',
        program(
          lines(
            'higher = input.timeframe("D", "Higher timeframe")',
            'higherClose = request.security(syminfo.tickerid, higher, close)',
            'emit "higher_close" higherClose',
          ),
        ),
      ].join('\n\n'),
      category: 'Colors, symbols and time',
    },
    'input.symbol': {
      summary:
        'Declares a text input that names a symbol, such as `"NASDAQ:AAPL"`.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: [
        'Tea does not check the symbol. A common use is the `symbol` of {@link request.security}.',
        program(
          lines(
            'other = input.symbol("NASDAQ:QQQ", "Compare with")',
            'otherClose = request.security(other, timeframe.period, close)',
            'emit "ratio" close / otherClose',
          ),
        ),
      ].join('\n\n'),
      category: 'Colors, symbols and time',
    },
    'input.price': {
      summary: 'Declares a price-level input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      examples: [
        example(
          '`above` is `true` only on bars 3 and 5, whose closes, 15 and 18, are above the default level of 12.',
          lines(
            'level = input.price(12.0, "Level")',
            'emit "close" close',
            'emit "above" close > level',
          ),
          CLOSES,
        ),
      ],
      category: 'Numbers',
    },
    'input.session': {
      summary:
        'Declares a text input for a trading session, such as `"0930-1600"`.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        options: textOptions('["0930-1600", "0400-2000"]'),
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details:
        'Tea does not interpret session text; the value is an ordinary string.',
      category: 'Colors, symbols and time',
    },
    'input.time': {
      summary: 'Declares an input that holds a point in time.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: `Tea treats the value as a plain \`int\`; give it in milliseconds since the Unix epoch so it compares directly with {@link time}. ${HIDDEN_BY_DEFAULT}`,
      examples: [
        example(
          'Bars are 12 hours apart and bar 2 opens at 2024-01-01 00:00 UTC, the default start, so `started` is `true` from bar 2 on.',
          lines(
            'start = input.time(1704067200000, "Start") // 2024-01-01 00:00 UTC',
            'emit "bar_time" time',
            'emit "started" time >= start',
          ),
          lines(
            'time',
            '1703980800000',
            '1704024000000',
            '1704067200000',
            '1704110400000',
            '1704153600000',
            '1704196800000',
          ),
        ),
      ],
      see: ['time'],
      category: 'Colors, symbols and time',
    },
    'input.text_area': {
      summary: 'Declares a multi-line text input.',
      params: {
        defval: INPUT_DEFAULT,
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details: HIDDEN_BY_DEFAULT,
      category: 'Text and choices',
    },
    'input.source': {
      summary:
        'Declares an input that chooses which series, such as `close` or `high`, the script reads.',
      params: {
        defval:
          'The series read when the host supplies none, written as a series alias such as `close`.',
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
        confirm: INPUT_CONFIRM,
      },
      returns: 'The chosen series’ value on the current bar.',
      details:
        'The host supplies the name of a series, such as `"high"`, and must bind a data stream that has it. The result can be used like {@link close}, including its history. A source input cannot be declared inside a request expression, and a request expression cannot read one.',
      examples: [
        example(
          'The host supplies no series name, so `source` is `close` and `average` is the 3-bar average of the closes.',
          lines(
            'source = input.source(close, "Source")',
            'emit "close" close',
            'emit "average" ta.sma(source, 3)',
          ),
          CLOSES,
        ),
      ],
      see: ['input.series'],
      category: 'Series inputs',
    },
    'input.enum': {
      summary: 'Declares an input that selects one member of an enum.',
      params: {
        defval:
          'The member used when the host supplies none; its enum is the type of the result.',
        title: INPUT_TITLE,
        options:
          'The only members the host may choose, as a bracketed list such as `[Average.sma, Average.ema]`; the default must be one of them. Without it, every member is allowed.',
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        confirm: INPUT_CONFIRM,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns: INPUT_RESULT,
      details:
        'A host supplies the member’s name, such as `"ema"`, not its title.',
      examples: [
        example(
          '`kind` is its default member, `Average.sma`, so `average` is the 3-bar simple average.',
          lines(
            'enum Average',
            '    sma = "Simple"',
            '    ema = "Exponential"',
            '',
            'kind = input.enum(Average.sma, "Average")',
            'sma = ta.sma(close, 3)',
            'ema = ta.ema(close, 3)',
            'emit "close" close',
            'emit "average" kind == Average.sma ? sma : ema',
          ),
          CLOSES,
        ),
      ],
      see: ['input.string'],
      category: 'Text and choices',
    },
    input: {
      summary: 'Declares an input whose type follows its default value.',
      params: {
        defval:
          'The value used when the host supplies none. An `int`, `float`, `bool`, `string` or `color` constant declares an input of that type; a series alias such as `close` declares a source input like {@link input.source}.',
        title: INPUT_TITLE,
        tooltip: INPUT_TOOLTIP,
        inline: INPUT_INLINE,
        group: INPUT_GROUP,
        display: INPUT_DISPLAY,
        active: INPUT_ACTIVE,
      },
      returns:
        'The value the host supplied, or the default; for a source input, the chosen series’ value on the current bar.',
      details: lines(
        'An input is fixed when the host binds the script and keeps that value on every bar; using another value means binding the script again. Each input call declares one input however many times it runs, and exported library functions cannot declare inputs. Arguments such as `title`, `group`, `display` and `active` only describe how a host presents an input.',
        '',
        'An input is named after the variable that declares it, and the host sets it by that name: `length = input.int(14)` declares the input `length`, which `tea run` sets with `--length 20`. That variable must be at the top level, initialized by the input call alone, declared without `var` or `varip`, and never reassigned. Any other input, such as one inside a function, a block or a larger expression, is named by its position, `input@line:column`: the host and `tea run` can set it only by that name, and a request expression cannot read the variable it initializes. Without a `title`, an input written as `fast = input.int(9)` inside a function or block, with `fast` never reassigned, is labeled `fast`.',
        '',
        'An input read inside a request expression is the request’s own copy: the host sets it separately for that request, and a value set for the script does not reach it.',
        '',
        'A `bool` or `color` input is hidden by default (`display.none`).',
      ),
      examples: [
        example(
          '`length` is an `int` input and `source` a source input, so with their defaults `average` is the 3-bar average of the closes.',
          lines(
            'length = input(3, "Length")',
            'source = input(close, "Source")',
            'emit "close" close',
            'emit "average" ta.sma(source, length)',
          ),
          CLOSES,
        ),
      ],
      see: ['input.int', 'input.source'],
      category: 'Any type',
    },
    'input.series': {
      summary:
        'Declares a numeric series that the host supplies with every input row.',
      params: {
        name: 'The name of the series in the bound data stream. It cannot be empty, `time`, `provisional` or `firstAttempt`, which input rows already use.',
      },
      returns:
        'The series’ value on the current row; `na` when the row has none.',
      details:
        'Every call with the same name reads the same series. A script can call it only at its top level, and a library only as an exported alias such as `export vwap = input.series("vwap")`, which is how {@link close} and the other price series are defined. Unlike {@link input.source}, the name is fixed in the source and is not a setting.',
      examples: [
        example(
          '`vwap` reads the CSV column of that name, so `distance` is `close - vwap` on each bar.',
          lines(
            'vwap = input.series("vwap")',
            'emit "close" close',
            'emit "vwap" vwap',
            'emit "distance" close - vwap',
          ),
          lines(
            'time,close,vwap',
            '0,9,9.5',
            '1,12,11.75',
            '2,12,12.5',
            '3,15,14.25',
            '4,12,13',
            '5,18,16.5',
          ),
        ),
      ],
      see: ['input.source'],
      category: 'Series inputs',
    },

    // ---- math -----------------------------------------------------------------
    'math.abs': {
      summary: 'Returns the absolute value of a number.',
      params: {number: 'The number.'},
      returns:
        '`number` without its sign, with the same type; `na` when it is `na`.',
      examples: [
        example(
          '`size` is `change` without its sign, so bar 4’s `-3` becomes 3; both are `na` on bar 0.',
          lines(
            'change = close - close[1]',
            'emit "close" close',
            'emit "change" change',
            'emit "size" math.abs(change)',
          ),
          CLOSES,
        ),
      ],
      see: ['math.sign'],
      category: 'Arithmetic',
    },
    'math.sign': {
      summary: 'Returns the sign of a number as -1, 0 or 1.',
      params: {number: 'The number.'},
      returns:
        '`-1` for a negative number, `1` for a positive one and `0` for zero, with the type of `number`; `na` when it is `na`.',
      examples: [
        example(
          '`direction` is 1 where the close rose, -1 on bar 4, where it fell, and 0 on bar 2, where it did not change.',
          lines(
            'emit "close" close',
            'emit "direction" math.sign(close - close[1])',
          ),
          CLOSES,
        ),
      ],
      see: ['math.abs'],
      category: 'Arithmetic',
    },
    'math.floor': {
      summary: 'Rounds a number down to an integer.',
      params: {number: 'The number to round.'},
      returns:
        'The largest integer that is not greater than `number`; `na` when it is `na`.',
      examples: [
        example(
          'Rounding down goes toward negative infinity, so `negative` is `-3`, while `int(-2.7)` is `-2`.',
          lines(
            'emit "positive" math.floor(2.7)',
            'emit "negative" math.floor(-2.7)',
          ),
        ),
      ],
      see: ['math.ceil', 'math.round', 'int'],
      category: 'Rounding',
    },
    'math.ceil': {
      summary: 'Rounds a number up to an integer.',
      params: {number: 'The number to round.'},
      returns:
        'The smallest integer that is not less than `number`; `na` when it is `na`.',
      examples: [
        example(
          'Rounding up goes toward positive infinity, so `positive` is 3 and `negative` is `-2`.',
          lines(
            'emit "positive" math.ceil(2.2)',
            'emit "negative" math.ceil(-2.7)',
          ),
        ),
      ],
      see: ['math.floor', 'math.round'],
      category: 'Rounding',
    },
    'math.round': {
      summary:
        'Rounds a number to the nearest integer, or to a number of decimal places.',
      params: {
        number: 'The value to round.',
        precision:
          'How many decimal places to keep. A negative value rounds to tens, hundreds and so on.',
      },
      returns:
        'An `int` without `precision` and a `float` with it; `na` when an argument is `na`.',
      formula: String.raw`\begin{aligned}
\operatorname{round}(\mathit{number}) &= \left\lfloor \mathit{number} + \tfrac{1}{2} \right\rfloor \\
\operatorname{round}(\mathit{number}, \mathit{precision}) &= \left\lfloor \mathit{number} \cdot 10^{\mathit{precision}} + \tfrac{1}{2} \right\rfloor / 10^{\mathit{precision}}
\end{aligned}`,
      details:
        'Halves round up, toward positive infinity: `math.round(2.5)` is `3` and `math.round(-2.5)` is `-2`. With `precision`, the product of `number` and 10 to the power `precision` is computed in binary floating point before it is rounded, so the result can differ from decimal arithmetic: `math.round(2.675, 2)` is `2.68`, because `2.675 * 100` gives exactly `267.5`, but `math.round(1.005, 2)` is `1`, because `1.005 * 100` gives slightly less than `100.5`. The result is `na` when that product, or 10 to the power `precision`, is too large to represent, as for any `precision` above 308. It is also `na` for a `precision` below -323, where 10 to the power `precision` is too small to represent.',
      examples: [
        example(
          'Halves round up, so `negative_half` is `-2`; `cents` is 2.68 because `2.675 * 100` computes to exactly 267.5, but `below_half` is 1 because `1.005 * 100` computes to just under 100.5. 10 to the power 400 is too large, so `overflow` is `na`.',
          lines(
            'emit "half" math.round(2.5)',
            'emit "negative_half" math.round(-2.5)',
            'emit "cents" math.round(2.675, 2)',
            'emit "below_half" math.round(1.005, 2)',
            'emit "hundreds" math.round(1234.5, -2)',
            'emit "overflow" math.round(2.5, 400)',
          ),
        ),
      ],
      see: ['math.floor', 'math.ceil', 'str.tostring'],
      category: 'Rounding',
    },
    'math.sqrt': {
      summary: 'Returns the square root of a number.',
      params: {number: 'The number.'},
      returns: 'The square root; `na` when `number` is negative or `na`.',
      examples: [
        example(
          'A negative number has no real square root, so `negative` is `na`.',
          lines('emit "root" math.sqrt(16)', 'emit "negative" math.sqrt(-4)'),
        ),
      ],
      see: ['math.pow'],
      category: 'Powers and logarithms',
    },
    'math.pow': {
      summary: 'Raises a number to a power.',
      params: {base: 'The number to raise.', exponent: 'The power.'},
      returns:
        '`base` raised to `exponent`; `na` when an argument is `na` or the result is not a finite real number, such as a negative base with a fractional exponent.',
      examples: [
        example(
          'An exponent of `1.0 / 3` takes a cube root. A negative base with a fractional exponent has no real result, and an `na` base gives `na` even with the exponent 0.',
          lines(
            'emit "power" math.pow(2, 10)',
            'emit "cube_root" math.pow(27, 1.0 / 3)',
            'emit "negative_base" math.pow(-8, 1.0 / 3)',
            'emit "missing" math.pow(float(na), 0)',
          ),
        ),
      ],
      see: ['math.sqrt', 'math.exp'],
      category: 'Powers and logarithms',
    },
    'math.log': {
      summary: 'Returns the natural logarithm of a number.',
      params: {number: 'The number.'},
      returns:
        'The base-e logarithm; `na` when `number` is zero, negative or `na`.',
      examples: [
        example(
          'The natural logarithm of `math.e` is 1; zero has no logarithm, so `zero` is `na`.',
          lines('emit "one" math.log(math.e)', 'emit "zero" math.log(0)'),
        ),
      ],
      see: ['math.log10', 'math.exp'],
      category: 'Powers and logarithms',
    },
    'math.log10': {
      summary: 'Returns the base-10 logarithm of a number.',
      params: {number: 'The number.'},
      returns:
        'The base-10 logarithm; `na` when `number` is zero, negative or `na`.',
      examples: [
        example(
          '`thousand` is 3, since 10 to the power 3 is 1000; a negative number has no logarithm, so `negative` is `na`.',
          lines(
            'emit "thousand" math.log10(1000)',
            'emit "negative" math.log10(-1)',
          ),
        ),
      ],
      see: ['math.log'],
      category: 'Powers and logarithms',
    },
    'math.exp': {
      summary: 'Returns e raised to a power.',
      params: {number: 'The power.'},
      returns:
        'e to the power `number`; `na` when `number` is `na` or the result is too large to represent.',
      examples: [
        example(
          '`one` is e itself; e to the power 1000 is too large to represent, so `large` is `na`.',
          lines('emit "one" math.exp(1)', 'emit "large" math.exp(1000)'),
        ),
      ],
      see: ['math.log', 'math.e'],
      category: 'Powers and logarithms',
    },
    'math.avg': {
      summary: 'Returns the average of its arguments.',
      params: {number: 'The numbers to average; at least one.'},
      returns: 'Their arithmetic mean; `na` when any argument is `na`.',
      formula: String.raw`\operatorname{avg}(x_1, \dots, x_n) = \frac{x_1 + \dots + x_n}{n}`,
      examples: [
        example(
          '`middle` is halfway between each bar’s open and close, such as 9.5 on bar 0.',
          lines(
            'emit "open" open',
            'emit "close" close',
            'emit "middle" math.avg(open, close)',
          ),
          OPENS_AND_CLOSES,
        ),
      ],
      see: ['math.max', 'math.min', 'ta.sma'],
      category: 'Arithmetic',
    },
    'math.max': {
      summary: 'Returns the largest of its arguments.',
      params: {
        number: 'The first number.',
        number1: 'The other numbers; at least one.',
      },
      returns:
        'The largest argument, as an `int` when every argument is an `int` and as a `float` otherwise; `na` when any argument is `na`.',
      examples: [
        example(
          '`top` is the higher of each bar’s open and close: the open on bars 0 and 4, where the price fell, and the close elsewhere.',
          lines(
            'emit "open" open',
            'emit "close" close',
            'emit "top" math.max(open, close)',
          ),
          OPENS_AND_CLOSES,
        ),
      ],
      see: ['math.min'],
      category: 'Arithmetic',
    },
    'math.min': {
      summary: 'Returns the smallest of its arguments.',
      params: {
        number: 'The first number.',
        number1: 'The other numbers; at least one.',
      },
      returns:
        'The smallest argument, as an `int` when every argument is an `int` and as a `float` otherwise; `na` when any argument is `na`.',
      examples: [
        example(
          '`bottom` is the lower of each bar’s open and close: the close on bars 0 and 4, where the price fell, and the open elsewhere.',
          lines(
            'emit "open" open',
            'emit "close" close',
            'emit "bottom" math.min(open, close)',
          ),
          OPENS_AND_CLOSES,
        ),
      ],
      see: ['math.max'],
      category: 'Arithmetic',
    },

    // ---- request --------------------------------------------------------------
    'request.security': {
      summary:
        'Evaluates an expression on another symbol’s or timeframe’s data and returns its value for each bar.',
      params: {
        symbol: REQUEST_SYMBOL,
        timeframe: REQUEST_TIMEFRAME,
        expression: REQUEST_EXPRESSION,
        fill: `What the result holds on a bar where no new requested value arrived since the previous bar: \`"carry"\`, the default, repeats the latest value, and \`"sparse"\` gives the type’s ${EMPTY_VALUE}. It must be known when the script is bound.`,
      },
      returns: `The expression’s value from the requested data for the current bar, with the expression’s type; the type’s ${EMPTY_VALUE} until the requested data has produced a value.`,
      details: [
        `${requestPlacement('daily = request.security(...)')} History inside \`expression\` refers to the requested data, so \`close[1]\` there is its previous bar. To get several values, declare one request for each.`,
        `Without event times on both data streams, requested values are paired with bars in order, one for each bar; once the requested data runs out, the remaining bars produce no output and no error. When both streams carry event times, each bar receives the newest requested value that opened at or before it, and ${REQUEST_LATE}.`,
        'A requested value is used from the time its bar opens, not from when that bar closes, and there is no `lookahead` or `gaps` argument. So when the host supplies each daily bar with its final values, an intraday bar at 00:00 already sees that day’s close. With `latest = request.security("AAPL", "D", close)` and `previous = request.security("AAPL", "D", close[1])`, and daily bars for Day 1 and Day 2 that close at 100 and 200:',
        lines(
          '| Intraday bar opens | `latest` | `previous` |',
          '| ------------------ | -------- | ---------- |',
          '| Day 1 00:00        | 100      | `na`       |',
          '| Day 1 06:00        | 100      | `na`       |',
          '| Day 1 12:00        | 100      | `na`       |',
          '| Day 2 00:00        | 200      | 100        |',
          '| Day 2 06:00        | 200      | 100        |',
        ),
        `${REQUEST_CONTEXT} See [Requests](/requests) for binding and synchronization.`,
        program(
          lines(
            'daily = request.security(syminfo.tickerid, "D", close[1])',
            'emit "previous_daily_close" daily',
          ),
        ),
      ].join('\n\n'),
      see: ['request.security_lower_tf'],
      category: 'Requests',
    },
    'request.security_lower_tf': {
      summary:
        'Collects an expression’s values from finer-grained data into an array for each bar.',
      params: {
        symbol: REQUEST_SYMBOL,
        timeframe: REQUEST_TIMEFRAME,
        expression: REQUEST_EXPRESSION,
      },
      returns:
        'An array of the expression’s values collected for the current bar, oldest first; empty when there are none. With event times, these are the values that opened after the previous bar and up to the current bar’s time.',
      details: [
        requestPlacement('ranges = request.security_lower_tf(...)'),
        `When both data streams carry event times, a bar collects the requested values that opened after the previous bar and up to its own time, and the first bar collects every value up to its time; ${REQUEST_LATE}. A bar’s time is the time it opens, so a daily bar collects mostly the previous day’s values. With values every 6 hours from Day 1 00:00 under daily bars:`,
        lines(
          '| Daily bar opens | Values collected, by the time they opened |',
          '| --------------- | ----------------------------------------- |',
          '| Day 1 00:00     | Day 1 00:00                               |',
          '| Day 2 00:00     | Day 1 06:00, 12:00, 18:00 and Day 2 00:00 |',
          '| Day 3 00:00     | Day 2 06:00, 12:00, 18:00 and Day 3 00:00 |',
        ),
        'Without event times, values are collected in order. When the script’s data stream declares a regular period that holds a whole number of requested periods, each bar collects that number of values, such as four for each daily bar when `timeframe` is `"360"` (6 hours); otherwise each bar collects one value. The requested period is the one the requested stream declares, or else the one `timeframe` names. Once the requested data runs out, the remaining bars produce no output and no error.',
        `${REQUEST_CONTEXT} See [Requests](/requests).`,
        program(
          lines(
            'ranges = request.security_lower_tf(syminfo.tickerid, "15", high - low)',
            'emit "intraday_bars" ranges.size()',
          ),
        ),
      ].join('\n\n'),
      see: ['request.security'],
      category: 'Requests',
    },

    // ---- color ----------------------------------------------------------------
    'color.new': {
      summary: 'Returns a color with its transparency replaced.',
      params: {
        color: 'The base color. Its current transparency is discarded.',
        transp: 'The new transparency, from 0 (opaque) to 100 (invisible).',
      },
      returns:
        'The color with the given transparency; `na` when either argument is `na`.',
      formula: String.raw`\begin{aligned}
c &= \min(\max(\mathit{transp}, 0), 100) \\
\mathit{alpha} &= \operatorname{round}\left(\frac{255 \cdot (100 - c)}{100}\right)
\end{aligned}`,
      details:
        '`alpha` is the opacity channel, from 0 (invisible) to 255 (opaque), which an emitted color shows as `a`; halves round up. The red, green and blue channels stay the same. A constant `transp` outside 0 to 100 is a compile error; any other value outside that range, such as an input’s, is clamped to it.',
      examples: [
        example(
          'Transparency 80 keeps the red, green and blue channels and sets the opacity `a` to 51 of 255, the `33` at the end of the hex code. Transparency 50 gives 127.5, which rounds up to 128.',
          lines(
            'faded = color.new(color.blue, 80)',
            'emit "blue" color.blue',
            'emit "faded" faded',
            'emit "hex" str.tostring(faded)',
            'emit "half" color.new(color.blue, 50)',
          ),
        ),
      ],
      see: ['color.rgb'],
      category: 'Creating colors',
    },
    'color.rgb': {
      summary: 'Builds a color from red, green and blue components.',
      params: {
        red: 'The red component, from 0 to 255.',
        green: 'The green component, from 0 to 255.',
        blue: 'The blue component, from 0 to 255.',
        transp:
          'The transparency, from 0 (opaque, the default) to 100 (invisible), applied as {@link color.new} applies it.',
      },
      returns: 'The color; `na` when any argument is `na`.',
      details:
        'Components are rounded to whole numbers, with halves rounded up. A constant outside its range is a compile error; any other value outside it is clamped.',
      examples: [
        example(
          'Without `transp` the color is opaque, `a` 255; a transparency of 80 leaves an opacity of 51.',
          lines(
            'emit "amber" color.rgb(255, 191, 0)',
            'emit "faded" color.rgb(255, 191, 0, 80)',
          ),
        ),
      ],
      see: ['color.new'],
      category: 'Creating colors',
    },

    // ---- array ----------------------------------------------------------------
    'array.new': {
      summary: 'Creates an array, empty or with a given number of elements.',
      params: {
        size: 'The number of elements.',
        initial: `The value of every element. Without it, each element is the element type’s ${EMPTY_VALUE}.`,
      },
      returns: 'A new array.',
      details: `Write the element type in angle brackets, as in \`array.new<float>(3)\`, unless \`initial\` gives it. A negative or \`na\` size stops the run with an error. ${LIMIT}; a larger size also stops the run. ${ALLOCATIONS_LINK}; see {@link array.push}. A variable declared as \`array<float> values = na\` holds no array, and calling a function on it stops the run with an error.`,
      examples: [
        example(
          '`zeros` holds three zeros; without `initial`, both elements of `missing` are `na`.',
          lines(
            'zeros = array.new(3, 0.0)',
            'missing = array.new<float>(2)',
            'emit "zeros" zeros',
            'emit "missing" missing',
          ),
        ),
      ],
      see: ['array.from'],
      category: 'Creating and copying',
    },
    'array.from': {
      summary: 'Creates an array holding the given values in order.',
      params: {values: 'The elements, in order.'},
      returns: 'A new array.',
      details:
        'The element type comes from the values; integers mixed with floats make a `float` array. With no values, or only `na`, write the type: `array.from<float>()`.',
      examples: [
        example(
          'The `int` values 1 and 4 join 2.5 in one `array<float>`; `first` is the element at position 0.',
          lines(
            'levels = array.from(1, 2.5, 4)',
            'emit "levels" levels',
            'emit "first" levels.get(0)',
          ),
        ),
      ],
      see: ['array.new'],
      category: 'Creating and copying',
    },
    'array.copy': {
      summary: 'Returns a copy of an array.',
      params: {self: ARRAY_SELF},
      returns: 'A new array with the same elements.',
      details:
        'Arrays are values, so plain assignment already copies: after `b = a`, `b.push(x)` leaves `a` unchanged, and a function that pushes to an array it receives changes only its own copy. The copy is shallow: struct elements still refer to the same structs.',
      examples: [
        example(
          'Pushing to the copy `b` leaves `a` with its two elements.',
          lines(
            'a = array.from(1.0, 2.0)',
            'b = a.copy()',
            'b.push(3.0)',
            'emit "a" a',
            'emit "b" b',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'array.size': {
      summary: 'Returns the number of elements in an array.',
      params: {self: ARRAY_SELF},
      returns: 'The number of elements.',
      category: 'Reading',
    },
    'array.is_empty': {
      summary: 'Tests whether an array has no elements.',
      params: {self: ARRAY_SELF},
      returns: '`true` when the array has no elements.',
      category: 'Reading',
    },
    'array.get': {
      summary: 'Returns the element at a position.',
      params: {
        self: ARRAY_SELF,
        index: 'The position, counting from 0 for the first element.',
      },
      returns: 'The element. A struct element is the same struct, not a copy.',
      details:
        'An index that is negative, `na`, or not less than the size stops the run with an error; negative indexes do not count from the end.',
      examples: [
        example(
          'Positions count from 0, so `values.get(1)` is the second element, 20.',
          lines(
            'values = array.from(10, 20, 30)',
            'emit "second" values.get(1)',
          ),
        ),
      ],
      see: ['array.set'],
      category: 'Reading',
    },
    'array.first': {
      summary: 'Returns the first element of an array.',
      params: {self: ARRAY_SELF},
      returns: 'The element at position 0.',
      details: 'An empty array stops the run with an error.',
      examples: [
        example(
          '`first` is the element at position 0, 10.',
          lines(
            'values = array.from(10, 20, 30)',
            'emit "first" values.first()',
          ),
        ),
      ],
      see: ['array.last'],
      category: 'Reading',
    },
    'array.last': {
      summary: 'Returns the last element of an array.',
      params: {self: ARRAY_SELF},
      returns: 'The element at the highest position.',
      details: 'An empty array stops the run with an error.',
      examples: [
        example(
          '`last` is the element at the highest position, 30.',
          lines('values = array.from(10, 20, 30)', 'emit "last" values.last()'),
        ),
      ],
      see: ['array.first'],
      category: 'Reading',
    },
    'array.set': {
      summary: 'Replaces the element at a position.',
      params: {
        self: ARRAY_UPDATED,
        index: 'The position, counting from 0 for the first element.',
        value: 'The new element.',
      },
      details: `An index that is negative, \`na\`, or not less than the size stops the run with an error. ${ALLOCATIONS_LINK}; see {@link array.push}.`,
      examples: [
        example(
          '`values.set(1, 25)` replaces the second element.',
          lines(
            'values = array.from(10, 20, 30)',
            'values.set(1, 25)',
            'emit "values" values',
          ),
        ),
      ],
      see: ['array.get'],
      category: 'Changing',
    },
    'array.push': {
      summary: 'Appends a value to the end of an array.',
      params: {
        self: ARRAY_UPDATED,
        value: 'The value to append.',
      },
      details: lines(
        `Appending to one variable does not change array values already assigned to other variables or committed to history, and a function that pushes to an array it receives changes only its own copy. A struct element is stored by reference. ${LIMIT}; pushing past that stops the run with an error.`,
        '',
        allocationBudget(
          'push',
          'an array of numbers created empty in a bar fails on its 2,046th push in that bar',
        ),
      ),
      examples: [
        example(
          'Declared with `var`, the array keeps its elements from bar to bar, so it gains one close on each bar.',
          lines(
            'var closes = array.new<float>()',
            'closes.push(close)',
            'emit "close" close',
            'emit "closes" closes',
          ),
          CLOSES,
        ),
      ],
      see: ['array.pop'],
      category: 'Changing',
    },
    'array.pop': {
      summary: 'Removes the last element of an array and returns it.',
      params: {self: ARRAY_UPDATED},
      returns: 'The removed element.',
      details: 'An empty array stops the run with an error.',
      examples: [
        example(
          '`pop` returns the last element, 30, and leaves the other two.',
          lines(
            'values = array.from(10, 20, 30)',
            'removed = values.pop()',
            'emit "removed" removed',
            'emit "values" values',
          ),
        ),
      ],
      see: ['array.push'],
      category: 'Changing',
    },
    'array.clear': {
      summary: 'Removes every element of an array.',
      params: {self: ARRAY_UPDATED},
      examples: [
        example(
          'After `clear`, `values` has no elements, so `size` is 0 and `empty` is `true`.',
          lines(
            'values = array.from(10, 20, 30)',
            'values.clear()',
            'emit "size" values.size()',
            'emit "empty" values.is_empty()',
          ),
        ),
      ],
      see: ['array.pop'],
      category: 'Changing',
    },

    // ---- matrix ---------------------------------------------------------------
    'matrix.new': {
      summary: 'Creates a matrix with a fixed number of rows and columns.',
      params: {
        rows: 'The number of rows.',
        columns: 'The number of columns.',
        initial:
          'The value of every element. It is required when `rows` and `columns` are given.',
      },
      returns: 'A new matrix.',
      details: `Without arguments the matrix has no rows or columns, and the element type must be written: \`matrix.new<float>()\`. A matrix keeps its shape; no function adds or removes rows or columns. A negative or \`na\` dimension stops the run with an error. ${LIMIT}; a larger matrix also stops the run. ${ALLOCATIONS_LINK}; see {@link matrix.set}. A \`for … in\` loop cannot iterate over a matrix; loop over its rows and columns by index.`,
      examples: [
        example(
          '`grid` has 2 rows and 3 columns of zeros; after the `set`, its second row ends with 5.',
          lines(
            'grid = matrix.new<float>(2, 3, 0.0)',
            'grid.set(1, 2, 5.0)',
            'emit "rows" grid.rows()',
            'emit "columns" grid.columns()',
            'emit "second_row" grid.row(1)',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'matrix.copy': {
      summary: 'Returns a copy of a matrix.',
      params: {self: MATRIX_SELF},
      returns: 'A new matrix with the same shape and elements.',
      details:
        'Matrices are values, so plain assignment already copies them, and a function that changes a matrix it receives changes only its own copy. The copy is shallow: struct elements still refer to the same structs.',
      examples: [
        example(
          'Setting an element of the copy `b` leaves `a` unchanged.',
          lines(
            'a = matrix.new<int>(1, 2, 0)',
            'b = a.copy()',
            'b.set(0, 0, 5)',
            'emit "a" a.row(0)',
            'emit "b" b.row(0)',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'matrix.rows': {
      summary: 'Returns the number of rows in a matrix.',
      params: {self: MATRIX_SELF},
      returns: 'The number of rows.',
      category: 'Reading',
    },
    'matrix.columns': {
      summary: 'Returns the number of columns in a matrix.',
      params: {self: MATRIX_SELF},
      returns: 'The number of columns.',
      category: 'Reading',
    },
    'matrix.elements_count': {
      summary: 'Returns the number of elements in a matrix.',
      params: {self: MATRIX_SELF},
      returns: 'The number of rows times the number of columns.',
      category: 'Reading',
    },
    'matrix.get': {
      summary: 'Returns the element at a row and column.',
      params: {
        self: MATRIX_SELF,
        row: 'The row, counting from 0.',
        column: 'The column, counting from 0.',
      },
      returns: 'The element. A struct element is the same struct, not a copy.',
      details:
        'A row or column outside the matrix, or `na`, stops the run with an error.',
      examples: [
        example(
          'Rows and columns count from 0, so `grid.get(1, 0)` reads the first element of the second row, 7.',
          lines(
            'grid = matrix.new<int>(2, 2, 0)',
            'grid.set(1, 0, 7)',
            'emit "cell" grid.get(1, 0)',
          ),
        ),
      ],
      see: ['matrix.set'],
      category: 'Reading',
    },
    'matrix.row': {
      summary: 'Returns one row of a matrix as a new array.',
      params: {self: MATRIX_SELF, row: 'The row, counting from 0.'},
      returns:
        'A new array of the row’s elements from left to right; later changes to the matrix do not affect it.',
      details:
        'A row outside the matrix, or `na`, stops the run with an error.',
      examples: [
        example(
          '`top` was read before the `set`, so it keeps the old first row; `changed` shows the 9.',
          lines(
            'grid = matrix.new<int>(2, 3, 0)',
            'top = grid.row(0)',
            'grid.set(0, 1, 9)',
            'emit "top" top',
            'emit "changed" grid.row(0)',
          ),
        ),
      ],
      see: ['matrix.column'],
      category: 'Reading',
    },
    'matrix.column': {
      summary: 'Returns one column of a matrix as a new array.',
      params: {self: MATRIX_SELF, column: 'The column, counting from 0.'},
      returns:
        'A new array of the column’s elements from top to bottom; later changes to the matrix do not affect it.',
      details:
        'A column outside the matrix, or `na`, stops the run with an error.',
      examples: [
        example(
          'The second column reads 7 from the first row and 0 from the second.',
          lines(
            'grid = matrix.new<int>(2, 3, 0)',
            'grid.set(0, 1, 7)',
            'emit "second_column" grid.column(1)',
          ),
        ),
      ],
      see: ['matrix.row'],
      category: 'Reading',
    },
    'matrix.set': {
      summary: 'Replaces the element at a row and column.',
      params: {
        self: MATRIX_UPDATED,
        row: 'The row, counting from 0.',
        column: 'The column, counting from 0.',
        value: 'The new element.',
      },
      details: lines(
        'A row or column outside the matrix, or `na`, stops the run with an error. A function that changes a matrix it receives changes only its own copy.',
        '',
        allocationBudget(
          'set',
          'a 100 by 100 matrix of numbers created in a bar allows 208 calls to `set` in that bar, and the 209th fails',
        ),
      ),
      examples: [
        example(
          '`grid.set(0, 1, 7)` changes only the second element of the first row.',
          lines(
            'grid = matrix.new<int>(2, 2, 0)',
            'grid.set(0, 1, 7)',
            'emit "first_row" grid.row(0)',
            'emit "second_row" grid.row(1)',
          ),
        ),
      ],
      see: ['matrix.get', 'matrix.fill'],
      category: 'Changing',
    },
    'matrix.fill': {
      summary: 'Sets every element of a matrix to one value.',
      params: {self: MATRIX_UPDATED, value: 'The value for every element.'},
      details: `${ALLOCATIONS_LINK}; see {@link matrix.set}.`,
      examples: [
        example(
          'After `fill(1)`, every element of both rows is 1.',
          lines(
            'grid = matrix.new<int>(2, 2, 0)',
            'grid.fill(1)',
            'emit "first_row" grid.row(0)',
            'emit "second_row" grid.row(1)',
          ),
        ),
      ],
      see: ['matrix.set'],
      category: 'Changing',
    },

    // ---- map ------------------------------------------------------------------
    'map.new': {
      summary: 'Creates an empty map.',
      params: {},
      returns: 'A new map with no entries.',
      details: `Write the key and value types in angle brackets, as in \`map.new<string, float>()\`. Keys can be \`int\`, \`float\`, \`bool\`, \`string\`, \`color\` or an enum, and an \`na\` key stops the run with an error. A map keeps its keys in the order they were added. ${LIMIT}. ${ALLOCATIONS_LINK}; see {@link map.put}. A variable declared as \`map<string, float> prices = na\` holds no map, and calling a function on it stops the run with an error.`,
      examples: [
        example(
          '`latest` holds only the key `"close"`, so looking up `"open"` gives `na`.',
          lines(
            'latest = map.new<string, float>()',
            'latest.put("close", close)',
            'emit "close" latest.get("close")',
            'emit "open" latest.get("open")',
          ),
          CLOSES,
        ),
      ],
      see: ['map.put', 'map.get'],
      category: 'Creating and copying',
    },
    'map.copy': {
      summary: 'Returns a copy of a map.',
      params: {self: MAP_SELF},
      returns: 'A new map with the same entries in the same order.',
      details:
        'Maps are values, so plain assignment already copies them, and a function that changes a map it receives changes only its own copy. The copy is shallow: struct values still refer to the same structs.',
      examples: [
        example(
          'Adding a key to the copy `b` leaves `a` with its one key.',
          lines(
            'a = map.new<string, int>()',
            'a.put("x", 1)',
            'b = a.copy()',
            'b.put("y", 2)',
            'emit "a" a.keys()',
            'emit "b" b.keys()',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'map.size': {
      summary: 'Returns the number of entries in a map.',
      params: {self: MAP_SELF},
      returns: 'The number of keys.',
      category: 'Reading',
    },
    'map.is_empty': {
      summary: 'Tests whether a map has no entries.',
      params: {self: MAP_SELF},
      returns: '`true` when the map has no keys.',
      category: 'Reading',
    },
    'map.contains': {
      summary: 'Tests whether a map has a key.',
      params: {self: MAP_SELF, key: 'The key to look for.'},
      returns: '`true` when the key is present, even if its value is `na`.',
      examples: [
        example(
          'The key `"gap"` is present although its value is `na`, so `stored` is `true` while `value` is `na`.',
          lines(
            'levels = map.new<string, float>()',
            'levels.put("gap", na)',
            'emit "stored" levels.contains("gap")',
            'emit "value" levels.get("gap")',
          ),
        ),
      ],
      see: ['map.get'],
      category: 'Reading',
    },
    'map.get': {
      summary: 'Returns the value stored under a key.',
      params: {self: MAP_SELF, key: 'The key to look up.'},
      returns: `The value, or the value type’s ${EMPTY_VALUE} when the key is absent. Use {@link map.contains} to tell an absent key from a stored \`na\`.`,
      details:
        'Keys match by value; colors match by their channels, so `#FF0000` and `#FF0000FF` are the same key.',
      examples: [
        example(
          '`"z"` is not a key, so `missing` is `na` and `has_z` is `false`.',
          lines(
            'levels = map.new<string, float>()',
            'levels.put("a", 1.5)',
            'emit "a" levels.get("a")',
            'emit "missing" levels.get("z")',
            'emit "has_z" levels.contains("z")',
          ),
        ),
      ],
      see: ['map.contains', 'map.put'],
      category: 'Reading',
    },
    'map.keys': {
      summary: 'Returns the keys of a map as a new array.',
      params: {self: MAP_SELF},
      returns: 'A new array of the keys, in the order they were added.',
      see: ['map.values'],
      category: 'Reading',
    },
    'map.values': {
      summary: 'Returns the values of a map as a new array.',
      params: {self: MAP_SELF},
      returns: 'A new array of the values, in the order their keys were added.',
      see: ['map.keys'],
      category: 'Reading',
    },
    'map.put': {
      summary: 'Stores a value under a key, replacing any value already there.',
      params: {
        self: MAP_UPDATED,
        key: 'The key to store under.',
        value: 'The value to store.',
      },
      details: lines(
        `Replacing a value keeps its key’s position; a new key goes last. ${LIMIT}; adding a key past that stops the run with an error. A function that puts into a map it receives changes only its own copy.`,
        '',
        allocationBudget(
          'put',
          'a map from strings to numbers created empty in a bar fails on its 1,447th new key in that bar',
        ),
      ),
      examples: [
        example(
          'Replacing the value under `"b"` keeps `"b"` first; `"a"`, added after it, stays second.',
          lines(
            'counts = map.new<string, int>()',
            'counts.put("b", 1)',
            'counts.put("a", 2)',
            'counts.put("b", 3)',
            'emit "keys" counts.keys()',
            'emit "values" counts.values()',
          ),
        ),
      ],
      see: ['map.get', 'map.remove'],
      category: 'Changing',
    },
    'map.remove': {
      summary: 'Removes a key from a map and returns its value.',
      params: {self: MAP_UPDATED, key: 'The key to remove.'},
      returns: `The removed value, or the value type’s ${EMPTY_VALUE} when the key was absent.`,
      details: 'A key that is added again after removal goes last.',
      examples: [
        example(
          'Removing `"b"` returns its value, 1; put back, `"b"` now comes after `"a"`.',
          lines(
            'counts = map.new<string, int>()',
            'counts.put("b", 1)',
            'counts.put("a", 2)',
            'removed = counts.remove("b")',
            'counts.put("b", 3)',
            'emit "removed" removed',
            'emit "keys" counts.keys()',
          ),
        ),
      ],
      see: ['map.put'],
      category: 'Changing',
    },
    'map.clear': {
      summary: 'Removes every entry of a map.',
      params: {self: MAP_UPDATED},
      category: 'Changing',
    },
  };

export const NATIVE_VALUE_DOCS: Readonly<Record<string, NativeValueDoc>> = {
  // ---- math -------------------------------------------------------------------
  'math.pi': {
    summary: 'The ratio of a circle’s circumference to its diameter, π.',
    category: 'Constants',
  },
  'math.e': {
    summary: 'Euler’s number, the base of the natural logarithm.',
    see: ['math.exp', 'math.log'],
    category: 'Constants',
  },

  // ---- market data ------------------------------------------------------------
  bar_index: {
    summary: 'The number of the current bar, counting from 0.',
    details:
      'It grows by one each time a bar is finalized; repeated updates of a live bar keep the same number. Inside a request expression it counts the requested data’s bars.',
    examples: [
      example(
        'The first bar is number 0, and each later bar is one more.',
        lines('emit "close" close', 'emit "bar_index" bar_index'),
        CLOSES,
      ),
    ],
    see: ['barstate.isfirst'],
    category: 'Bar and time',
  },
  time: {
    summary: 'The current bar’s time, in milliseconds since the Unix epoch.',
    details:
      'It is the `time` field of the current input row, the time at which the bar opens. Reading it requires the bound data stream to carry that field; without it, the run stops with an error. Inside a request expression it is the requested data’s bar time.',
    examples: [
      example(
        'The bars open one minute, 60,000 milliseconds, apart, so `minute` counts up from 0.',
        lines('emit "bar_time" time', 'emit "minute" time / 60000'),
        lines('time', '0', '60000', '120000', '180000', '240000', '300000'),
      ),
    ],
    see: ['input.time', 'timenow'],
    category: 'Bar and time',
  },
  timenow: {
    summary: 'The current clock time, in milliseconds since the Unix epoch.',
    details:
      'The host’s clock is read once for each execution, so repeated updates of a live bar can see different values. A host may supply a fixed clock instead, for reproducible runs. Inside a request expression it is read when the requested data’s bar executes.',
    see: ['time'],
    category: 'Bar and time',
  },
  'syminfo.tickerid': {
    summary:
      'The full symbol identifier, including its exchange prefix, such as `NASDAQ:AAPL`.',
    details: `${SYMBOL_IN_REQUEST} Used as a request’s \`symbol\`, it must be supplied before the script can start.`,
    category: 'Symbol',
  },
  'syminfo.ticker': {
    summary:
      'The symbol name without its exchange prefix, such as `AAPL` for `NASDAQ:AAPL`.',
    details: `The host supplies it separately; Tea does not take it from {@link syminfo.tickerid}. ${SYMBOL_IN_REQUEST}`,
    category: 'Symbol',
  },
  'syminfo.prefix': {
    summary:
      'The exchange prefix of the symbol, such as `NASDAQ` for `NASDAQ:AAPL`.',
    details: `The host supplies it separately; Tea does not take it from {@link syminfo.tickerid}. ${SYMBOL_IN_REQUEST}`,
    category: 'Symbol',
  },
  'syminfo.currency': {
    summary: 'The currency the symbol’s prices are quoted in, such as `USD`.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'syminfo.basecurrency': {
    summary:
      'The base currency of a currency pair, such as `BTC` for `BTCUSD`.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'syminfo.type': {
    summary: 'The kind of instrument, such as `stock` or `crypto`.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'syminfo.timezone': {
    summary:
      'The time zone of the symbol’s exchange, such as `America/New_York`.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'syminfo.mintick': {
    summary: 'The smallest price increment of the symbol.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'syminfo.pointvalue': {
    summary: 'The value of a one-point price move, in the symbol’s currency.',
    details: SYMBOL_IN_REQUEST,
    category: 'Symbol',
  },
  'timeframe.period': {
    summary:
      'The timeframe of the script’s data as text, such as `"15"` or `"D"`.',
    details: `${TIMEFRAME_IN_REQUEST} Used as a request’s \`timeframe\`, it must be supplied before the script can start.`,
    category: 'Timeframe',
  },
  'timeframe.multiplier': {
    summary:
      'The number of units in the timeframe, such as `15` for a 15-minute timeframe.',
    details: `The host supplies it separately from {@link timeframe.period}; Tea does not derive one from the other. ${TIMEFRAME_IN_REQUEST} Used where a value must be known when the script is bound, such as a history offset in \`close[timeframe.multiplier]\`, it must be supplied before the script can start.`,
    category: 'Timeframe',
  },
  'timeframe.isseconds': {
    summary: 'Whether the timeframe is measured in seconds.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.isminutes': {
    summary: 'Whether the timeframe is measured in minutes.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.isintraday': {
    summary: 'Whether the timeframe is shorter than one day.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.isdaily': {
    summary: 'Whether the timeframe is measured in days.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.isweekly': {
    summary: 'Whether the timeframe is measured in weeks.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.ismonthly': {
    summary: 'Whether the timeframe is measured in months.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.isdwm': {
    summary: 'Whether the timeframe is measured in days, weeks or months.',
    details: FLAG_FROM_HOST,
    category: 'Timeframe',
  },
  'barstate.isfirst': {
    summary:
      'Whether the current bar is the first one, where {@link bar_index} is 0.',
    details:
      'Inside a request expression it refers to the requested data’s first bar.',
    examples: [
      example(
        '`first` is `true` only on bar 0.',
        lines('emit "close" close', 'emit "first" barstate.isfirst'),
        CLOSES,
      ),
    ],
    see: ['bar_index'],
    category: 'Bar state',
  },
  'barstate.ishistory': {
    summary: 'Whether the script is processing historical data.',
    details:
      'It is always the opposite of {@link barstate.isrealtime}, including inside a request expression.',
    category: 'Bar state',
  },
  'barstate.isrealtime': {
    summary: 'Whether the script is processing live data.',
    details:
      'The host reports it for each execution. It is `false` unless the host marks the data as live, so runs over stored data report `false`. Inside a request expression it is read when the requested data’s bar executes.',
    see: ['barstate.ishistory'],
    category: 'Bar state',
  },
  'barstate.isconfirmed': {
    summary: 'Whether the current update is the bar’s final one.',
    details:
      'It is `false` on provisional updates of a live bar and `true` on its final update. Rows that are not marked provisional are final, so historical bars are always confirmed. Inside a request expression it describes the requested data’s update. Use it to act only on completed bars.',
    examples: [
      example(
        'No row of a CSV run is provisional, so every bar is confirmed and `completed_bars` counts every bar.',
        lines(
          'var int completed = 0',
          'if barstate.isconfirmed',
          '    completed := completed + 1',
          'emit "close" close',
          'emit "completed_bars" completed',
        ),
        CLOSES,
      ),
    ],
    see: ['barstate.isnew'],
    category: 'Bar state',
  },
  'barstate.isnew': {
    summary: 'Whether this is the first update of the current bar.',
    details:
      'It is `true` for the first execution of each bar and `false` when a live bar is updated again. Historical bars run once, so they are always new. Inside a request expression it describes the requested data’s bar.',
    see: ['barstate.isconfirmed'],
    category: 'Bar state',
  },

  // ---- color ------------------------------------------------------------------
  'color.*': {
    summary: 'Tea’s standard palette of named colors.',
    details:
      'The values belong to Tea, not to the host application’s theme. Use {@link color.new} for a transparent version.',
    examples: [
      example(
        'The close falls only on bar 4, so `bar_color` is `color.red` there and `color.green` elsewhere; on bar 0, `close[1]` is `na` and the comparison is `false`.',
        lines(
          'falling = close < close[1]',
          'emit "close" close',
          'emit "bar_color" falling ? color.red : color.green',
        ),
        CLOSES,
      ),
    ],
    see: ['color.new', 'color.rgb'],
    category: 'Palette',
  },

  // ---- plots ------------------------------------------------------------------
  'plot.style_*': {
    summary: 'Drawing styles for the `style` argument of {@link plot}.',
    details:
      'Tea records the chosen name in the description that {@link plot} emits, and the host decides how each style looks; the notes give each style’s usual appearance.',
    members: {
      'plot.style_line': 'A line through the values that bridges `na` values.',
      'plot.style_stepline':
        'Horizontal steps that change level at each new value.',
      'plot.style_histogram':
        'A vertical bar from the `histbase` level to each value.',
      'plot.style_columns':
        'A filled column from the `histbase` level to each value.',
      'plot.style_area':
        'A line with the area between it and the `histbase` level filled.',
      'plot.style_circles': 'A circle at each value.',
      'plot.style_cross': 'A cross at each value.',
      'plot.style_linebr':
        'Like `plot.style_line`, but with a gap wherever the value is `na`.',
      'plot.style_areabr':
        'Like `plot.style_area`, but with a gap wherever the value is `na`.',
    },
    examples: [
      example(
        'Every row’s description records `"style":"columns"`; the host draws the columns.',
        'plot("volume", volume, style = plot.style_columns)',
        lines(
          'time,volume',
          '0,100',
          '1,150',
          '2,120',
          '3,180',
          '4,90',
          '5,200',
        ),
      ),
    ],
    category: 'Style constants',
  },
  'hline.style_*': {
    summary: 'Line styles for the `linestyle` argument of {@link hline}.',
    details:
      'Tea records the chosen name in the description that {@link hline} emits; the host draws the line.',
    examples: [
      example(
        'The description records `"linestyle":"dashed"`.',
        'hline("zero", 0, linestyle = hline.style_dashed)',
      ),
    ],
    category: 'Style constants',
  },
  'location.*': {
    summary:
      'Positions for the `location` argument of {@link plotshape} and {@link plotchar}.',
    details:
      'Tea records the chosen name in the emitted description; the host places the marker.',
    members: {
      'location.abovebar': 'Above the bar.',
      'location.belowbar': 'Below the bar.',
      'location.top': 'At the top of the chart pane.',
      'location.bottom': 'At the bottom of the chart pane.',
      'location.absolute':
        'At a price level given by the plotted value. `plotshape` and `plotchar` plot a `bool`, so they give no price to place it at.',
    },
    category: 'Style constants',
  },
  'shape.*': {
    summary: 'Marker shapes for the `style` argument of {@link plotshape}.',
    details:
      'Tea records the chosen name in the emitted description; the host draws the shape.',
    members: {
      'shape.xcross': 'A diagonal cross, ×.',
      'shape.cross': 'An upright cross, +.',
      'shape.labelup': 'A label with its pointer at the top.',
      'shape.labeldown': 'A label with its pointer at the bottom.',
    },
    examples: [
      example(
        '`"series"` is `true` only on bar 5, where the close crosses above its 3-bar average; every row records the shape, `"triangleup"`.',
        lines(
          'crossed = ta.crossover(close, ta.sma(close, 3))',
          'plotshape("cross", crossed, style = shape.triangleup, location = location.belowbar, size = size.small)',
        ),
        CLOSES,
      ),
    ],
    category: 'Style constants',
  },
  'size.*': {
    summary:
      'Marker sizes for the `size` argument of {@link plotshape} and {@link plotchar}.',
    details:
      'Tea records the chosen name in the emitted description; the host decides the actual sizes.',
    members: {
      'size.auto': 'The host chooses the size.',
    },
    category: 'Style constants',
  },
  'display.*': {
    summary: 'Where a host shows a plot’s or an input’s value.',
    details:
      'Plot functions accept every constant in their `display` argument; inputs accept all except `display.pane` and `display.price_scale`. Tea records the choice in the plot’s description or the input’s settings for the host; it does not change any calculated value.',
    members: {
      'display.none': 'Not shown.',
      'display.all': 'Everywhere the host shows values.',
      'display.data_window': 'Only in the host’s data window.',
      'display.pane': 'Only in the chart pane. Inputs reject it.',
      'display.price_scale': 'Only on the price scale. Inputs reject it.',
      'display.status_line': 'Only in the status line.',
    },
    examples: [
      example(
        'Every row records `"display":"data_window"` next to the RSI value in `"series"`, which `display` does not change.',
        'plot("rsi", ta.rsi(close, 3), "RSI", display = display.data_window)',
        CLOSES,
      ),
    ],
    category: 'Style constants',
  },
  'format.*': {
    summary: 'Number formats for the `format` argument of {@link plot}.',
    details:
      'Tea records the chosen name in the plot description; the host formats the numbers.',
    members: {
      'format.inherit':
        'The host’s default format. This is the default of {@link plot}.',
    },
    examples: [
      example(
        'Every row records `"format":"percent"`; the values are the change in percent, such as 25 on bar 3.',
        'plot("change", ta.roc(close, 1), "Change", format = format.percent)',
        CLOSES,
      ),
    ],
    category: 'Style constants',
  },
  'position.*': {
    summary: 'Anchor positions for tables on a chart.',
    details:
      'Tea cannot create tables yet, so no function accepts these constants.',
    category: 'Style constants',
  },
};
