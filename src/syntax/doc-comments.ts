// Purpose: Doc comments — the `/** … */` block directly above a declaration, parsed into a summary, a Markdown body and tags for the reference and editor tooling.

/**
 * One parsed doc comment. The first paragraph is the summary and later prose
 * is Markdown. Tags follow the prose, each starting a line outside a code
 * fence and running until the next tag:
 *
 * - `@param name text`, `@returns text`, `@category Name` and `@see name`
 *   (one name per tag) read as one line;
 * - `@formula`, `@warmup`, `@example` and `@pine` keep their line breaks.
 *
 * A tag Tea does not know is dropped, and a malformed `@param` is ignored, so
 * parsing never fails on user text. The reference tests reject both.
 */
export interface DocComment {
  readonly summary: string;
  readonly body: string;
  readonly params: ReadonlyMap<string, string>;
  readonly returns: string | null;
  readonly category: string | null;
  /** TeX for one display-math block, without `$` delimiters. */
  readonly formula: string | null;
  /** When the result is `na` at the start, and how `na` inputs propagate. */
  readonly warmup: string | null;
  readonly examples: readonly DocExample[];
  /** A difference from Pine Script v6 that remains. */
  readonly pine: string | null;
  /** Documented names, as code writes them; outlets resolve them like `{@link}`. */
  readonly see: readonly string[];
}

/**
 * One `@example`: a caption, a complete program and the CSV it runs on. The
 * reference runs the program and shows what it writes.
 *
 * @example
 * ```ts
 * parseDocComment('Doubles.\n@example\nOn two bars.\n```tea\nemit "x" close * 2\n```\n```csv\ntime,close\n0,1\n1,2\n```')
 *   .examples[0]; // {caption: 'On two bars.', source: 'emit "x" close * 2', csv: 'time,close\n0,1\n1,2'}
 * ```
 */
export interface DocExample {
  /** Markdown shown above the program; may be empty. */
  readonly caption: string;
  /** The program; empty when the tag has no `tea` fence. */
  readonly source: string;
  /** The input, whose first column is `time`; null runs one bar with `time` 0. */
  readonly csv: string | null;
}

/**
 * The doc comment that ends on the line directly above `line`, or null: a
 * block comment opened with `/**` whose closing marker ends that line. A
 * leading `*` on each inner line is optional and removed; a block without
 * them keeps each line's indentation beyond what all its lines share. Like
 * any comment, it is trivia to the compiler.
 *
 * @param lines The file's source split into lines.
 * @param line The 1-based line of the declaration.
 *
 * @example
 * ```ts
 * const lines = source.split('\n');
 * docCommentAbove(lines, decl.pos.line)?.summary; // the declaration's summary
 * ```
 */
export function docCommentAbove(
  lines: readonly string[],
  line: number,
): DocComment | null {
  const end = line - 2;
  if (end < 0 || !lines[end]!.trimEnd().endsWith('*/')) return null;
  let start = end;
  while (start >= 0 && !lines[start]!.trimStart().startsWith('/*')) start--;
  if (start < 0) return null;
  const opening = lines[start]!.trim();
  if (!opening.startsWith('/**') || opening.startsWith('/**/')) return null;
  const inner = lines
    .slice(start, end + 1)
    .join('\n')
    .trim()
    .slice(3, -2)
    .split('\n');
  const rest = inner.slice(1);
  // Lines without the `*` decoration lose only the indentation they share.
  const bare = rest.filter(text => !/^\s*\*/.test(text) && text.trim() !== '');
  const shared = Math.min(
    ...bare.map(text => /^\s*/.exec(text)![0].length),
    Infinity,
  );
  const body = rest.map(text =>
    /^\s*\*/.test(text)
      ? text.replace(/^\s*\* ?/, '').trimEnd()
      : text.slice(Math.min(shared, /^\s*/.exec(text)![0].length)).trimEnd(),
  );
  return parseDocComment([inner[0]!.trim(), ...body].join('\n').trim());
}

const TAG = /^@(\w+)\s*([\s\S]*)$/;
const ONE_LINE = new Set(['param', 'returns', 'category', 'see']);

/** Parse a doc comment's text, already stripped of its markers. */
export function parseDocComment(text: string): DocComment {
  const lines = text.split('\n');
  // A line opens a tag only outside a fence, so an `@` in code stays code.
  const tags: string[][] = [];
  const prose: string[] = [];
  let fenced = false;
  for (const line of lines) {
    if (!fenced && TAG.test(line)) tags.push([line]);
    else (tags.at(-1) ?? prose).push(line);
    if (line.trimStart().startsWith('```')) fenced = !fenced;
  }
  const [summary = '', ...rest] = prose
    .join('\n')
    .trim()
    .split(/\n\s*\n/);
  const params = new Map<string, string>();
  const single = new Map<string, string>();
  const examples: DocExample[] = [];
  const see: string[] = [];
  for (const block of tags) {
    const [, tag, raw] = TAG.exec(block.join('\n'))!;
    const value = ONE_LINE.has(tag!)
      ? raw!.trim().replace(/\s*\n\s*/g, ' ')
      : raw!.trim();
    if (tag === 'param') {
      const param = /^(\w+)\s+(.+)$/.exec(value);
      if (param !== null) params.set(param[1]!, param[2]!);
    } else if (tag === 'example') {
      examples.push(parseExample(value));
    } else if (tag === 'see') {
      see.push(value);
    } else if (tag !== undefined) {
      single.set(tag, value);
    }
  }
  const tag = (name: string) => single.get(name) ?? null;
  return {
    summary: summary.replace(/\s*\n\s*/g, ' '),
    body: rest.join('\n\n'),
    params,
    returns: tag('returns'),
    category: tag('category'),
    formula: tag('formula'),
    warmup: tag('warmup'),
    examples,
    pine: tag('pine'),
    see,
  };
}

/** An `@example`'s caption, then its `tea` fence, then an optional `csv` fence. */
function parseExample(text: string): DocExample {
  const fence = (language: string) =>
    new RegExp(`^\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'm').exec(text);
  const program = fence('tea');
  const csv = fence('csv');
  return {
    caption: (program === null ? text : text.slice(0, program.index)).trim(),
    source: program?.[1] ?? '',
    csv: csv?.[1] ?? null,
  };
}
