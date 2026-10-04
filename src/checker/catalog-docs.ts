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
  'Where a host shows the input’s value: `display.all`, `display.data_window`, `display.status_line` or `display.none`; other `display` constants are rejected. The default is `display.all` unless the entry says otherwise.';
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
  'The symbol of the requested data, recorded for the host, which binds the matching data stream. It must be known when the script is bound: a constant, an input, or a fixed value such as {@link syminfo.tickerid}.';
const REQUEST_TIMEFRAME =
  'The timeframe of the requested data, such as `"60"` (60 minutes) or `"D"` (one day). Like `symbol`, it must be known when the script is bound.';
const REQUEST_EXPRESSION =
  'The calculation to run on the requested data, with that data’s own bars and history. It must produce one `int`, `float`, `bool`, `string`, `color` or enum value. It may read the script’s constants and inputs, except source inputs, but no other script variables; call a function to use several statements.';
function requestPlacement(declaration: string): string {
  return `The call must be the entire initializer of a top-level variable, such as \`${declaration}\`. The host binds the requested data stream under that variable’s name; Tea fetches no data itself.`;
}
const REQUEST_CONTEXT =
  'Inside `expression`, `syminfo` and `timeframe` values are what the host supplies for the requested data; Tea does not set them from `symbol` and `timeframe`.';

const ARRAY_SELF = 'The array.';
const ARRAY_UPDATED = 'The array to update.';
const MATRIX_SELF = 'The matrix.';
const MATRIX_UPDATED = 'The matrix to update.';
const MAP_SELF = 'The map.';
const MAP_UPDATED = 'The map to update.';
const LIMIT = 'A collection holds at most 100,000 elements';
const EMPTY_VALUE = 'empty value (`na`, or `false` for `bool`)';

const SYMBOL_FROM_HOST =
  'Supplied by the host when it binds the script; `na` when the host supplies none. Inside a request expression it is the host’s value for the requested data, not the request’s `symbol`.';
const TIMEFRAME_FROM_HOST =
  'Supplied by the host when it binds the script; `na` when the host supplies none. Inside a request expression it is the host’s value for the requested data, not the request’s `timeframe`.';
const FLAG_FROM_HOST =
  'Supplied by the host when it binds the script, separately from {@link timeframe.period}; `false` when the host supplies none. Inside a request expression it is the host’s value for the requested data.';

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
          '`true` to draw the script’s outputs over the price chart; `false`, the default, to draw them in a separate pane.',
      },
      details:
        'It must be the script’s first statement and appear at most once, and a library cannot declare it. The header only informs the host; it never changes how the script runs.',
      examples: [
        example(
          '',
          lines(
            'indicator("Bar range", overlay = false)',
            'plot("range", high - low, "Range")',
          ),
          lines(
            'time,high,low',
            '0,10,8',
            '1,12,9',
            '2,11,7',
            '3,13,9',
            '4,12,8',
            '5,15,10',
            '6,14,9',
            '7,16,11',
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
          '',
          lines(
            'previous = close[1]',
            'emit "has_previous" not na(previous) // false on the first bar',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Missing values',
    },
    nz: {
      summary: 'Replaces a missing value with a fallback.',
      params: {
        source: 'The value to check.',
        replacement:
          'The value to use when `source` is `na`. Without it, the fallback is `0` for numbers and fully transparent black for colors.',
      },
      returns: '`source` when it is not `na`, otherwise the replacement.',
      examples: [
        example(
          '',
          lines(
            'change = close - close[1]',
            'emit "change" nz(change) // 0 on the first bar',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Missing values',
    },
    int: {
      summary:
        'Converts a number to an integer by dropping its fractional part.',
      params: {x: 'The number to convert.'},
      returns:
        '`x` truncated toward zero, so `int(-2.7)` is `-2`; `na` when `x` is `na`.',
      category: 'Conversions',
    },
    float: {
      summary: 'Converts a number to a `float`.',
      params: {x: 'The number to convert.'},
      returns: '`x` as a `float`; `na` when `x` is `na`.',
      details:
        '`float(na)` is a missing value of type `float`. Use it where a bare `na` has no type, such as a request expression.',
      category: 'Conversions',
    },
    'str.tostring': {
      summary: 'Converts a value to text.',
      params: {value: 'The value to convert.'},
      returns: 'The text form of `value`; `"NaN"` when `value` is `na`.',
      details:
        'Numbers use the shortest form that reads back as the same number: `3.0` gives `"3"`, `0.1 + 0.2` gives `"0.30000000000000004"`, and very large or small numbers use exponent notation such as `"1e+21"`. There is no format argument; round with {@link math.round} first to limit the decimals. A `bool` gives `"true"` or `"false"`, a color its hex code such as `"#FF5252"` (with two more digits when it is transparent), and an enum member its title, or its name when it has no title.',
      examples: [
        example(
          '',
          lines('emit "label" "Close: " + str.tostring(math.round(close, 2))'),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Conversions',
    },
    'runtime.error': {
      summary: 'Stops the script with an error message.',
      params: {message: 'The error message.'},
      details: [
        'When a call runs, the run stops: no output is published for that bar or any later one, and the host receives the message. When the conditions around a call are all constants that make it run, it is a compile error at the call instead, so `ta.sma(close, 0)` is rejected where it is written. A call inside a loop, inside a `switch`, or after a statement that can leave the block early is only checked when it runs.',
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
          '',
          lines(
            'length = input.int(14, "Length", minval = 1, maxval = 200)',
            'emit "average" ta.sma(close, length)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
          '',
          lines(
            'width = input.float(2.0, "Band width", minval = 0.5, step = 0.5)',
            'emit "upper" ta.sma(close, 20) + width * ta.stdev(close, 20)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
          '',
          lines(
            'smooth = input.bool(true, "Smooth")',
            'average = ta.sma(close, 5)',
            'emit "value" smooth ? average : close',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
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
          '',
          lines(
            'kind = input.string("SMA", "Average", options = ["SMA", "EMA"])',
            'sma = ta.sma(close, 20)',
            'ema = ta.ema(close, 20)',
            'emit "average" kind == "SMA" ? sma : ema',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
          '',
          lines(
            'lineColor = input.color(color.blue, "Line color")',
            'plot("close", close, color = lineColor)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
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
          '',
          lines(
            'start = input.time(1704067200000, "Start") // 2024-01-01 00:00 UTC',
            'emit "started" time >= start',
          ),
        ),
      ],
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
        'The host supplies the name of a series, such as `"high"`, and must bind a data stream that has it. The result can be used like {@link close}, including its history. A source input cannot be declared inside a request expression.',
      examples: [
        example(
          '',
          lines(
            'source = input.source(close, "Source")',
            'emit "average" ta.sma(source, 10)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
          '',
          lines(
            'enum Average',
            '    sma = "Simple"',
            '    ema = "Exponential"',
            '',
            'kind = input.enum(Average.sma, "Average")',
            'sma = ta.sma(close, 20)',
            'ema = ta.ema(close, 20)',
            'emit "average" kind == Average.sma ? sma : ema',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
        'An input is fixed when the host binds the script and keeps that value on every bar; using another value means binding the script again. The host sets an input by the name of the top-level variable it directly initializes, such as `length` in `length = input.int(14)`. Any other input, such as one inside a function or an expression, is named by its position, `input@line:column`, and without a `title` its label is the name of the variable it initializes, if any. Each input call declares one input however many times it runs, and exported library functions cannot declare inputs. The arguments `title`, `tooltip`, `inline`, `group`, `confirm`, `display` and `active` only describe how a host presents an input.',
        '',
        'A `bool` or `color` input is hidden by default (`display.none`).',
      ),
      examples: [
        example(
          '',
          lines(
            'length = input(14, "Length")',
            'source = input(close, "Source")',
            'emit "average" ta.sma(source, length)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
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
          '',
          lines('vwap = input.series("vwap")', 'emit "distance" close - vwap'),
          lines(
            'time,close,vwap',
            '0,9,9.5',
            '1,11,11.2',
            '2,10,10.4',
            '3,12,11.6',
            '4,9,10.1',
            '5,14,12.8',
            '6,10,11.0',
            '7,15,13.4',
          ),
        ),
      ],
      category: 'Series inputs',
    },

    // ---- math -----------------------------------------------------------------
    'math.abs': {
      summary: 'Returns the absolute value of a number.',
      params: {number: 'The number.'},
      returns:
        '`number` without its sign, with the same type; `na` when it is `na`.',
      category: 'Arithmetic',
    },
    'math.sign': {
      summary: 'Returns the sign of a number as -1, 0 or 1.',
      params: {number: 'The number.'},
      returns:
        '`-1` for a negative number, `1` for a positive one and `0` for zero, with the type of `number`; `na` when it is `na`.',
      category: 'Arithmetic',
    },
    'math.floor': {
      summary: 'Rounds a number down to an integer.',
      params: {number: 'The number to round.'},
      returns:
        'The largest integer that is not greater than `number`; `na` when it is `na`.',
      category: 'Rounding',
    },
    'math.ceil': {
      summary: 'Rounds a number up to an integer.',
      params: {number: 'The number to round.'},
      returns:
        'The smallest integer that is not less than `number`; `na` when it is `na`.',
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
      details:
        'Halves round up, toward positive infinity: `math.round(2.5)` is `3` and `math.round(-2.5)` is `-2`. Decimal rounding works on binary floating-point values, so `math.round(1.005, 2)` is `1.0`, not `1.01`, because `1.005` is stored as slightly less than written.',
      examples: [
        example(
          '',
          lines(
            'emit "whole" math.round(close)',
            'emit "cents" math.round(close, 2)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Rounding',
    },
    'math.sqrt': {
      summary: 'Returns the square root of a number.',
      params: {number: 'The number.'},
      returns: 'The square root; `na` when `number` is negative or `na`.',
      category: 'Powers and logarithms',
    },
    'math.pow': {
      summary: 'Raises a number to a power.',
      params: {base: 'The number to raise.', exponent: 'The power.'},
      returns:
        '`base` raised to `exponent`; `na` when an argument is `na` or the result is not a finite real number, such as a negative base with a fractional exponent.',
      category: 'Powers and logarithms',
    },
    'math.log': {
      summary: 'Returns the natural logarithm of a number.',
      params: {number: 'The number.'},
      returns:
        'The base-e logarithm; `na` when `number` is zero, negative or `na`.',
      category: 'Powers and logarithms',
    },
    'math.log10': {
      summary: 'Returns the base-10 logarithm of a number.',
      params: {number: 'The number.'},
      returns:
        'The base-10 logarithm; `na` when `number` is zero, negative or `na`.',
      category: 'Powers and logarithms',
    },
    'math.exp': {
      summary: 'Returns e raised to a power.',
      params: {number: 'The power.'},
      returns:
        'e to the power `number`; `na` when `number` is `na` or the result is too large to represent.',
      category: 'Powers and logarithms',
    },
    'math.avg': {
      summary: 'Returns the average of its arguments.',
      params: {number: 'The numbers to average; at least one.'},
      returns: 'Their arithmetic mean; `na` when any argument is `na`.',
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
        fill: 'What the result holds on a bar where no new requested value arrived since the previous bar: `"carry"`, the default, repeats the latest value, and `"sparse"` gives `na`. It must be known when the script is bound.',
      },
      returns: `The expression’s value from the requested data for the current bar, with the expression’s type; the type’s ${EMPTY_VALUE} until the requested data has produced a value.`,
      details: [
        `${requestPlacement('daily = request.security(...)')} When both data streams carry event times, each bar receives the newest requested value that opened at or before it; otherwise requested values are paired with bars in order. History inside \`expression\` refers to the requested data, so \`close[1]\` there is its previous bar. ${REQUEST_CONTEXT} To get several values, declare one request for each. See [Requests](/requests) for binding and synchronization.`,
        program(
          lines(
            'daily = request.security(syminfo.tickerid, "D", close[1])',
            'emit "previous_daily_close" daily',
          ),
        ),
      ].join('\n\n'),
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
        'An array of the expression’s values that belong to the current bar, oldest first; empty when there are none.',
      details: [
        `${requestPlacement('ranges = request.security_lower_tf(...)')} When both data streams carry event times, a bar collects the requested values that opened after the previous bar and up to its own time. Without event times, a bar collects a fixed number of values when both streams have regular periods that divide evenly, and one value otherwise. ${REQUEST_CONTEXT} See [Requests](/requests).`,
        program(
          lines(
            'ranges = request.security_lower_tf(syminfo.tickerid, "15", high - low)',
            'emit "intraday_bars" ranges.size()',
          ),
        ),
      ].join('\n\n'),
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
      details:
        'A constant `transp` outside 0 to 100 is a compile error; a value computed while the script runs is clamped to that range.',
      examples: [
        example(
          '',
          lines(
            'faded = color.new(color.blue, 80)',
            'plot("close", close, color = faded)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Creating colors',
    },
    'color.rgb': {
      summary: 'Builds a color from red, green and blue components.',
      params: {
        red: 'The red component, from 0 to 255.',
        green: 'The green component, from 0 to 255.',
        blue: 'The blue component, from 0 to 255.',
        transp:
          'The transparency, from 0 (opaque, the default) to 100 (invisible).',
      },
      returns: 'The color; `na` when any argument is `na`.',
      details:
        'Components are rounded to whole numbers. Constants outside their range are compile errors; values computed while the script runs are clamped.',
      examples: [
        example(
          '',
          lines(
            'amber = color.rgb(255, 191, 0)',
            'plot("close", close, color = amber)',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
          ),
        ),
      ],
      category: 'Creating colors',
    },

    // ---- array ----------------------------------------------------------------
    'array.new': {
      summary: 'Creates an array, empty or with a given number of elements.',
      params: {
        size: 'The number of elements.',
        initial: `The value of every element. Without it, each element is the element type’s empty value (\`na\`, or \`false\` for \`bool\`).`,
      },
      returns: 'A new array.',
      details: `Write the element type in angle brackets, as in \`array.new<float>(3)\`, unless \`initial\` gives it. A negative size stops the run with an error. ${LIMIT}; a larger size also stops the run. A variable declared as \`array<float> values = na\` holds no array, and calling a function on it stops the run with an error.`,
      examples: [
        example(
          '',
          lines(
            'zeros = array.new(3, 0.0)',
            'missing = array.new<float>(2) // two na elements',
            'emit "sizes" zeros.size() + missing.size() // 5',
          ),
        ),
      ],
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
          '',
          lines(
            'levels = array.from(1, 2.5, 4) // an array<float>',
            'emit "first" levels.get(0) // 1',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'array.copy': {
      summary: 'Returns a copy of an array.',
      params: {self: ARRAY_SELF},
      returns: 'A new array with the same elements.',
      details:
        'Arrays are values, so plain assignment already copies: after `b = a`, `b.push(x)` leaves `a` unchanged. The copy is shallow: struct elements still refer to the same structs.',
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
          '',
          lines(
            'values = array.from(10, 20, 30)',
            'emit "second" values.get(1) // 20',
          ),
        ),
      ],
      category: 'Reading',
    },
    'array.first': {
      summary: 'Returns the first element of an array.',
      params: {self: ARRAY_SELF},
      returns: 'The element at position 0.',
      details: 'An empty array stops the run with an error.',
      category: 'Reading',
    },
    'array.last': {
      summary: 'Returns the last element of an array.',
      params: {self: ARRAY_SELF},
      returns: 'The element at the highest position.',
      details: 'An empty array stops the run with an error.',
      category: 'Reading',
    },
    'array.set': {
      summary: 'Replaces the element at a position.',
      params: {
        self: ARRAY_UPDATED,
        index: 'The position, counting from 0 for the first element.',
        value: 'The new element.',
      },
      details:
        'An index that is negative, `na`, or not less than the size stops the run with an error.',
      category: 'Changing',
    },
    'array.push': {
      summary: 'Appends a value to the end of an array.',
      params: {
        self: ARRAY_UPDATED,
        value: 'The value to append.',
      },
      details: `Appending to one variable does not change array values already assigned to other variables or committed to history. A struct element is stored by reference. ${LIMIT}; pushing past that stops the run with an error.`,
      examples: [
        example(
          '',
          lines(
            'values = array.new<float>()',
            'values.push(open)',
            'values.push(close)',
            'emit "count" values.size() // 2',
          ),
          lines(
            'time,open,close',
            '0,9,9',
            '1,10,11',
            '2,10,10',
            '3,10,12',
            '4,12,9',
            '5,10,14',
            '6,14,10',
            '7,11,15',
          ),
        ),
      ],
      category: 'Changing',
    },
    'array.pop': {
      summary: 'Removes the last element of an array and returns it.',
      params: {self: ARRAY_UPDATED},
      returns: 'The removed element.',
      details: 'An empty array stops the run with an error.',
      category: 'Changing',
    },
    'array.clear': {
      summary: 'Removes every element of an array.',
      params: {self: ARRAY_UPDATED},
      category: 'Changing',
    },

    // ---- matrix ---------------------------------------------------------------
    'matrix.new': {
      summary: 'Creates a matrix with a fixed number of rows and columns.',
      params: {
        rows: 'The number of rows.',
        columns: 'The number of columns.',
        initial: 'The value of every element.',
      },
      returns: 'A new matrix.',
      details: `Without arguments the matrix has no rows or columns, and the element type must be written: \`matrix.new<float>()\`. A matrix keeps its shape; no function adds or removes rows or columns. A negative dimension stops the run with an error. ${LIMIT}; a larger matrix also stops the run.`,
      examples: [
        example(
          '',
          lines(
            'grid = matrix.new<float>(2, 3, 0.0)',
            'grid.set(1, 2, close)',
            'emit "cells" grid.elements_count() // 6',
          ),
          lines(
            'time,close',
            '0,9',
            '1,11',
            '2,10',
            '3,12',
            '4,9',
            '5,14',
            '6,10',
            '7,15',
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
        'Matrices are values, so plain assignment already copies them. The copy is shallow: struct elements still refer to the same structs.',
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
      category: 'Reading',
    },
    'matrix.row': {
      summary: 'Returns one row of a matrix as a new array.',
      params: {self: MATRIX_SELF, row: 'The row, counting from 0.'},
      returns:
        'A new array of the row’s elements from left to right; later changes to the matrix do not affect it.',
      details:
        'A row outside the matrix, or `na`, stops the run with an error.',
      category: 'Reading',
    },
    'matrix.column': {
      summary: 'Returns one column of a matrix as a new array.',
      params: {self: MATRIX_SELF, column: 'The column, counting from 0.'},
      returns:
        'A new array of the column’s elements from top to bottom; later changes to the matrix do not affect it.',
      details:
        'A column outside the matrix, or `na`, stops the run with an error.',
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
      details:
        'A row or column outside the matrix, or `na`, stops the run with an error.',
      category: 'Changing',
    },
    'matrix.fill': {
      summary: 'Sets every element of a matrix to one value.',
      params: {self: MATRIX_UPDATED, value: 'The value for every element.'},
      category: 'Changing',
    },

    // ---- map ------------------------------------------------------------------
    'map.new': {
      summary: 'Creates an empty map.',
      params: {},
      returns: 'A new map with no entries.',
      details:
        'Write the key and value types in angle brackets, as in `map.new<string, float>()`. Keys can be `int`, `float`, `bool`, `string`, `color` or an enum. A map keeps its keys in the order they were added. A variable declared as `map<string, float> prices = na` holds no map, and calling a function on it stops the run with an error.',
      examples: [
        example(
          '',
          lines(
            'latest = map.new<string, float>()',
            'latest.put("close", close)',
            'emit "close" latest.get("close")',
            'emit "open" latest.get("open") // na: no such key',
          ),
          lines(
            'time,open,close',
            '0,9,9',
            '1,10,11',
            '2,10,10',
            '3,10,12',
            '4,12,9',
            '5,10,14',
            '6,14,10',
            '7,11,15',
          ),
        ),
      ],
      category: 'Creating and copying',
    },
    'map.copy': {
      summary: 'Returns a copy of a map.',
      params: {self: MAP_SELF},
      returns: 'A new map with the same entries in the same order.',
      details:
        'Maps are values, so plain assignment already copies them. The copy is shallow: struct values still refer to the same structs.',
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
      category: 'Reading',
    },
    'map.get': {
      summary: 'Returns the value stored under a key.',
      params: {self: MAP_SELF, key: 'The key to look up.'},
      returns: `The value, or the value type’s ${EMPTY_VALUE} when the key is absent. Use {@link map.contains} to tell an absent key from a stored \`na\`.`,
      details:
        'Keys match by value; colors match by their channels, so `#FF0000` and `#FF0000FF` are the same key.',
      category: 'Reading',
    },
    'map.keys': {
      summary: 'Returns the keys of a map as a new array.',
      params: {self: MAP_SELF},
      returns: 'A new array of the keys, in the order they were added.',
      category: 'Reading',
    },
    'map.values': {
      summary: 'Returns the values of a map as a new array.',
      params: {self: MAP_SELF},
      returns: 'A new array of the values, in the order their keys were added.',
      category: 'Reading',
    },
    'map.put': {
      summary: 'Stores a value under a key, replacing any value already there.',
      params: {
        self: MAP_UPDATED,
        key: 'The key to store under.',
        value: 'The value to store.',
      },
      details: `Replacing a value keeps its key’s position; a new key goes last. ${LIMIT}; adding a key past that stops the run with an error.`,
      category: 'Changing',
    },
    'map.remove': {
      summary: 'Removes a key from a map and returns its value.',
      params: {self: MAP_UPDATED, key: 'The key to remove.'},
      returns: `The removed value, or the value type’s ${EMPTY_VALUE} when the key was absent.`,
      details: 'A key that is added again after removal goes last.',
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
    category: 'Constants',
  },

  // ---- market data ------------------------------------------------------------
  bar_index: {
    summary: 'The number of the current bar, counting from 0.',
    details:
      'It grows by one each time a bar is finalized; repeated updates of a live bar keep the same number. Inside a request expression it counts the requested data’s bars.',
    category: 'Bar and time',
  },
  time: {
    summary: 'The current bar’s time, in milliseconds since the Unix epoch.',
    details:
      'It is the `time` field of the current input row, the time at which the bar opens. Reading it requires the bound data stream to carry that field; without it, the run stops with an error. Inside a request expression it is the requested data’s bar time.',
    category: 'Bar and time',
  },
  timenow: {
    summary: 'The current clock time, in milliseconds since the Unix epoch.',
    details:
      'The host’s clock is read once for each execution, so repeated updates of a live bar can see different values. A host may supply a fixed clock instead, for reproducible runs. Inside a request expression it is read when the requested data’s bar executes.',
    category: 'Bar and time',
  },
  'syminfo.tickerid': {
    summary:
      'The full symbol identifier, including its exchange prefix, such as `NASDAQ:AAPL`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.ticker': {
    summary:
      'The symbol name without its exchange prefix, such as `AAPL` for `NASDAQ:AAPL`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.prefix': {
    summary:
      'The exchange prefix of the symbol, such as `NASDAQ` for `NASDAQ:AAPL`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.currency': {
    summary: 'The currency the symbol’s prices are quoted in, such as `USD`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.basecurrency': {
    summary:
      'The base currency of a currency pair, such as `BTC` for `BTCUSD`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.type': {
    summary: 'The kind of instrument, such as `stock` or `crypto`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.timezone': {
    summary:
      'The time zone of the symbol’s exchange, such as `America/New_York`.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.mintick': {
    summary: 'The smallest price increment of the symbol.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'syminfo.pointvalue': {
    summary: 'The value of a one-point price move, in the symbol’s currency.',
    details: SYMBOL_FROM_HOST,
    category: 'Symbol',
  },
  'timeframe.period': {
    summary:
      'The timeframe of the script’s data as text, such as `"15"` or `"D"`.',
    details: TIMEFRAME_FROM_HOST,
    category: 'Timeframe',
  },
  'timeframe.multiplier': {
    summary:
      'The number of units in the timeframe, such as `15` for a 15-minute timeframe.',
    details: TIMEFRAME_FROM_HOST,
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
    category: 'Bar state',
  },
  'barstate.isconfirmed': {
    summary: 'Whether the current update is the bar’s final one.',
    details:
      'It is `false` on provisional updates of a live bar and `true` on its final update. Rows that are not marked provisional are final, so historical bars are always confirmed. Inside a request expression it describes the requested data’s update. Use it to act only on completed bars.',
    examples: [
      example(
        '',
        lines(
          'var int completed = 0',
          'if barstate.isconfirmed',
          '    completed := completed + 1',
          'emit "completed_bars" completed',
        ),
      ),
    ],
    category: 'Bar state',
  },
  'barstate.isnew': {
    summary: 'Whether this is the first update of the current bar.',
    details:
      'It is `true` for the first execution of each bar and `false` when a live bar is updated again. Historical bars run once, so they are always new. Inside a request expression it describes the requested data’s bar.',
    category: 'Bar state',
  },

  // ---- color ------------------------------------------------------------------
  'color.*': {
    summary: 'Tea’s standard palette of named colors.',
    details:
      'The values belong to Tea, not to the host application’s theme. Use {@link color.new} for a transparent version.',
    examples: [
      example(
        '',
        lines(
          'falling = close < close[1]',
          'plot("close", close, color = falling ? color.red : color.green)',
        ),
        lines(
          'time,close',
          '0,9',
          '1,11',
          '2,10',
          '3,12',
          '4,9',
          '5,14',
          '6,10',
          '7,15',
        ),
      ),
    ],
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
      'plot.style_linebr':
        'Like `plot.style_line`, but with a gap wherever the value is `na`.',
      'plot.style_areabr':
        'Like `plot.style_area`, but with a gap wherever the value is `na`.',
    },
    examples: [
      example(
        '',
        'plot("volume", volume, style = plot.style_columns)',
        lines(
          'time,volume',
          '0,100',
          '1,150',
          '2,120',
          '3,180',
          '4,90',
          '5,200',
          '6,110',
          '7,160',
        ),
      ),
    ],
    category: 'Style constants',
  },
  'hline.style_*': {
    summary: 'Line styles for the `linestyle` argument of {@link hline}.',
    details:
      'Tea records the chosen name in the description that {@link hline} emits; the host draws the line.',
    examples: [example('', 'hline("zero", 0, linestyle = hline.style_dashed)')],
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
        '',
        lines(
          'crossed = ta.crossover(close, ta.sma(close, 20))',
          'plotshape("cross", crossed, style = shape.triangleup, location = location.belowbar, size = size.small)',
        ),
        lines(
          'time,close',
          '0,9',
          '1,11',
          '2,10',
          '3,12',
          '4,9',
          '5,14',
          '6,10',
          '7,15',
        ),
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
      'Plot functions accept every constant in their `display` argument; inputs accept all except `display.pane` and `display.price_scale`. Tea records the choice for the host; it does not change what the script calculates or emits.',
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
        '',
        'plot("rsi", ta.rsi(close, 14), "RSI", display = display.data_window)',
        lines(
          'time,close',
          '0,9',
          '1,11',
          '2,10',
          '3,12',
          '4,9',
          '5,14',
          '6,10',
          '7,15',
        ),
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
        '',
        'plot("change", ta.roc(close, 1), "Change", format = format.percent)',
        lines(
          'time,close',
          '0,9',
          '1,11',
          '2,10',
          '3,12',
          '4,9',
          '5,14',
          '6,10',
          '7,15',
        ),
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
