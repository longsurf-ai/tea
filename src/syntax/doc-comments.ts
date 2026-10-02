// Purpose: Doc comments — the `/** … */` block directly above a declaration, parsed into a summary, a Markdown body and tags for the reference and editor tooling.

/**
 * One parsed doc comment. The first paragraph is the summary and later prose
 * is Markdown. Tags follow the prose: `@param name text`, `@returns text` and
 * `@category Name`; a tag runs until the next tag. A tag Tea does not know is
 * dropped, and a malformed `@param` is ignored, so parsing never fails on
 * user text.
 */
export interface DocComment {
  readonly summary: string;
  readonly body: string;
  readonly params: ReadonlyMap<string, string>;
  readonly returns: string | null;
  readonly category: string | null;
}

/**
 * The doc comment that ends on the line directly above `line`, or null: a
 * block comment opened with `/**` whose closing marker ends that line. A
 * leading `*` on each inner line is optional and removed. Like any comment,
 * it is trivia to the compiler.
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
  while (start >= 0 && !lines[start]!.includes('/*')) start--;
  if (start < 0) return null;
  const opening = lines[start]!.trim();
  if (!opening.startsWith('/**') || opening.startsWith('/**/')) return null;
  const inner = lines
    .slice(start, end + 1)
    .join('\n')
    .trim()
    .slice(3, -2)
    .split('\n')
    .map((text, index) =>
      index === 0 ? text.trim() : text.replace(/^\s*\*? ?/, '').trimEnd(),
    );
  return parseDocComment(inner.join('\n').trim());
}

const TAG = /^@(\w+)\s*([\s\S]*)$/;

/** Parse a doc comment's text, already stripped of its markers. */
export function parseDocComment(text: string): DocComment {
  const lines = text.split('\n');
  const firstTag = lines.findIndex(line => TAG.test(line));
  const prose = (firstTag === -1 ? lines : lines.slice(0, firstTag))
    .join('\n')
    .trim();
  const [summary = '', ...rest] = prose.split(/\n\s*\n/);
  const blocks: string[] = [];
  for (const line of firstTag === -1 ? [] : lines.slice(firstTag)) {
    if (TAG.test(line)) blocks.push(line);
    else blocks[blocks.length - 1] += `\n${line}`;
  }
  const params = new Map<string, string>();
  let returns: string | null = null;
  let category: string | null = null;
  for (const block of blocks) {
    const [, tag, raw] = TAG.exec(block)!;
    const value = raw!.trim().replace(/\s*\n\s*/g, ' ');
    if (tag === 'param') {
      const param = /^(\w+)\s+(.+)$/.exec(value);
      if (param !== null) params.set(param[1]!, param[2]!);
    } else if (tag === 'returns') {
      returns = value;
    } else if (tag === 'category') {
      category = value;
    }
  }
  return {
    summary: summary.replace(/\s*\n\s*/g, ' '),
    body: rest.join('\n\n'),
    params,
    returns,
    category,
  };
}
