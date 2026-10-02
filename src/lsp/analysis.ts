// Purpose: One document's compiler facts for the language server — analyze() runs the tooling frontend and returns LSP diagnostics plus a position-sorted index of every Name with the checker facts recorded for it.

import {DiagnosticSeverity} from 'vscode-languageserver';
import type {Diagnostic, Range} from 'vscode-languageserver';
import {formatPos, newFileBase, type Pos} from '../base/pos';
import {Errors} from '../base/print';
import type {CheckedPackage, Info} from '../checker/check';
import {SelectionKind} from '../checker/info';
// `Object` is the checker's semantic object. A type-only import leaves the
// global `Object` value in place.
import type {Object} from '../checker/object';
import {callsReaching, semanticContexts} from '../checker/semantic-contexts';
import {compileForTooling} from '../compiler';
import {importedFile, type PackageSource} from '../loader/loader';
import {NodeKind, type File, type Name, type Node} from '../syntax/nodes';
import {endPos, tokenize} from '../syntax/syntax';
import {KEYWORDS, Tok, type Token} from '../syntax/tokens';

/** What one semantic context (`info`) says a name refers to. */
export interface NameFact {
  readonly info: Info;
  readonly object: Object;
}

/**
 * One `Name` node of the document with every fact the checker recorded for
 * it. `facts` is empty where the checker recorded nothing: inside a free
 * function that is never called, and for the callee of a native call, which
 * has no `Object` (its resolution is in `Info.calls`).
 *
 * The name covers the half-open range from `name.pos` to `name.pos.col +
 * name.value.length`, in Tea's 1-based UTF-16 units; subtract one for LSP.
 */
export interface IndexedName {
  readonly name: Name;
  readonly facts: readonly NameFact[];
}

/**
 * The facts of one analyzed document. It is a snapshot of one source text:
 * nothing in it changes, and a new text needs a new `analyze`.
 */
export interface Analysis {
  /** The parsed document, partial where the parser recovered. */
  readonly file: File;
  /** The compiler's file dependencies, including failed import attempts. */
  readonly dependencies: readonly string[];
  /** Semantic facts of the document and of every library it imports. */
  readonly checked: CheckedPackage;
  /**
   * The compilation's errors as this document shows them, ordered by
   * position. An error the checker positions in another file, inside a library
   * function the document called with a signature its body rejects, is shown
   * on the call in this document that reached it.
   */
  readonly diagnostics: readonly Diagnostic[];
  /**
   * Every `Name` in the document with a non-empty spelling, sorted by
   * position; names never overlap, so a position finds at most one entry.
   *
   * Facts are collected from every semantic context: the package root, each
   * library package, each function instance (so a parameter of a function
   * called with two signatures has two facts), each generic struct, and each
   * request capture. They come from `Info.defs`, `Info.uses` and
   * `Info.selections`.
   *
   * A selector's facts are indexed under its `sel` name. In `bar.high` the
   * name `high` carries the `FieldObject`, in `syminfo.ticker` the name
   * `ticker` carries the `BuiltinObject`, and in `ta.ema` the name `ema`
   * carries the exported function, while `ta` carries the package name.
   */
  readonly names: readonly IndexedName[];
  /**
   * Where each object is defined: its defining `Name`s, from `Info.defs` of
   * whichever context owns them, this document's or a library's. A parameter
   * of a function called with two signatures is two objects with one name.
   */
  readonly definitions: ReadonlyMap<Object, readonly Name[]>;
  /**
   * The lines of every text the compilation parsed, by filename: this
   * document and each library it reached. Doc comments are read from them.
   */
  readonly lines: ReadonlyMap<string, readonly string[]>;
}

/**
 * Analyzes one document: parses it, checks it even past parse errors, and
 * projects the result into what a language server reads. Pure: the only I/O
 * is the loader reading the libraries the document imports, and nothing is
 * cached between calls.
 *
 * It never throws on user input. An `InternalError` is a compiler defect and
 * propagates; the server owns catching it.
 *
 * @example
 * ```ts
 * const {diagnostics, names} = analyze({
 *   filename: '/charts/rsi.tea',
 *   source: 'x = 1 +\ny = close + "a"\n',
 * });
 * diagnostics.map(d => d.message);
 * // ["expected expression, found 'newline'",
 * //  "operator '+' requires numeric operands (got float and string)"]
 * names.map(n => n.name.value); // ['x', 'y', 'close']
 * ```
 */
export function analyze(input: PackageSource): Analysis {
  const errors = new Errors();
  const {files, checked, dependencies, sources} = compileForTooling(
    [input],
    errors,
  );
  const file = files[0];

  const tokens = tokenize(newFileBase(input.filename), input.source, () => {});
  const lines = input.source.split('\n').map(line => line.trimEnd());
  const diagnostic = (range: Range, message: string): Diagnostic => ({
    range,
    severity: DiagnosticSeverity.Error,
    source: 'tea',
    message,
  });
  // An import path is one literal to the parser but several tokens to
  // tokenize(), so its range comes from the statement.
  const importPaths = file.stmtList.flatMap(stmt =>
    stmt.kind === NodeKind.ImportStmt ? [stmt.path] : [],
  );
  const diagnostics = errors.flushErrors().flatMap(error => {
    if (error.pos.base.filename === input.filename) {
      const path = importPaths.find(
        ({pos}) => pos.line === error.pos.line && pos.col === error.pos.col,
      );
      const range =
        path === undefined
          ? diagnosticRange(error.pos, tokens, lines)
          : nodeRange(path);
      return [diagnostic(range, error.msg)];
    }
    const calls = callsReaching(error, checked, new Set([input.filename]));
    const where = formatPos(error.pos);
    if (calls.length === 0) {
      // No call of this document reaches it, as with an error at the top of
      // an imported file. It goes on the import that names that file, or on
      // the document's first token, and is never dropped.
      const path = importPaths.find(
        ({value}) =>
          importedFile(value, input.filename) === error.pos.base.filename,
      );
      const range =
        path === undefined
          ? diagnosticRange(file.pos, tokens, lines)
          : nodeRange(path);
      return [diagnostic(range, `${where}: ${error.msg}`)];
    }
    return calls.map(call => {
      const range = nodeRange(call.fun);
      const callee = lines[range.start.line].slice(
        range.start.character,
        range.end.character,
      );
      return diagnostic(range, `in ${callee} (${where}): ${error.msg}`);
    });
  });
  diagnostics.sort(
    (a, b) =>
      a.range.start.line - b.range.start.line ||
      a.range.start.character - b.range.start.character,
  );

  return {
    file,
    checked,
    dependencies,
    diagnostics,
    names: indexNames(file, checked),
    definitions: indexDefinitions(checked),
    lines: new Map(
      [...sources].map(([filename, text]) => [filename, text.split('\n')]),
    ),
  };
}

// ---- diagnostics --------------------------------------------------------------

// A node's own range, in LSP's 0-based units.
function nodeRange(node: Parameters<typeof endPos>[0]): Range {
  const end = endPos(node);
  return {
    start: {line: node.pos.line - 1, character: node.pos.col - 1},
    end: {line: end.line - 1, character: end.col - 1},
  };
}

// An error carries one Pos. Its range is the token that starts there, or the
// rest of the line when none does. An error at a line end or at end of input
// has nothing after it, so it covers the last character before it instead. A
// range is therefore never empty.
function diagnosticRange(
  pos: Pos,
  tokens: readonly Token[],
  lines: readonly string[],
): Range {
  const token = tokens.find(
    t => t.pos.line === pos.line && t.pos.col === pos.col && tokenWidth(t) > 0,
  );
  let line = pos.line - 1;
  let start = pos.col - 1;
  let end =
    token === undefined ? lines[line].length : start + tokenWidth(token);
  if (end <= start) {
    while (line > 0 && lines[line].length === 0) {
      line -= 1;
    }
    end = Math.max(lines[line].length, 1);
    start = end - 1;
  }
  return {start: {line, character: start}, end: {line, character: end}};
}

// Source length of a token; tokens never span lines. Newline, indent, dedent
// and eof are synthesized by the scanner and have no text.
export function tokenWidth(token: Token): number {
  switch (token.tok) {
    case Tok.Name:
    case Tok.Literal:
      return token.lit.length;
    case Tok.Operator:
      return (token.op ?? '').length;
    case Tok.AssignOp:
      return (token.op ?? '').length + 1;
    case Tok.Newline:
    case Tok.Indent:
    case Tok.Dedent:
    case Tok.Eof:
      return 0;
    case Tok.Define:
    case Tok.Arrow:
      return 2;
    default:
      // A keyword's token kind is its spelling; the rest is one character.
      return (KEYWORDS as readonly string[]).includes(token.tok)
        ? token.tok.length
        : 1;
  }
}

// ---- name index ---------------------------------------------------------------

function indexNames(file: File, checked: CheckedPackage): IndexedName[] {
  const facts = new Map<Name, NameFact[]>();
  collectNames(file, facts);
  // Contexts also hold facts about library files; only this document's names
  // are keys of `facts`, so those fall away here. Within one Info a name is a
  // key of at most one of the three fact maps, so no fact repeats.
  const record = (name: Name, info: Info, object: Object): void => {
    facts.get(name)?.push({info, object});
  };
  for (const info of semanticContexts(checked)) {
    for (const [name, object] of info.defs) {
      record(name, info, object);
    }
    for (const [node, object] of info.uses) {
      if (node.kind === NodeKind.Name) {
        record(node, info, object);
      }
    }
    for (const [selector, selection] of info.selections) {
      record(
        selector.sel,
        info,
        selection.kind === SelectionKind.Field
          ? selection.field
          : selection.builtin,
      );
    }
  }
  return [...facts]
    .map(([name, recorded]) => ({name, facts: recorded}))
    .sort(
      (a, b) =>
        a.name.pos.line - b.name.pos.line || a.name.pos.col - b.name.pos.col,
    );
}

function indexDefinitions(checked: CheckedPackage): Map<Object, Name[]> {
  const definitions = new Map<Object, Name[]>();
  for (const info of semanticContexts(checked)) {
    for (const [name, object] of info.defs) {
      const names = definitions.get(object) ?? [];
      if (!names.includes(name)) names.push(name);
      definitions.set(object, names);
    }
  }
  return definitions;
}

/**
 * The syntax nodes directly under `node`. Every node is plain data
 * discriminated on `kind`, so its children are found by reflection, as the
 * AST dumper finds them.
 *
 * @example
 * ```ts
 * const walk = (node: Node): void => childNodes(node).forEach(walk);
 * ```
 */
export function childNodes(node: Node): Node[] {
  return Object.values(node)
    .flat()
    .filter(
      (value): value is Node =>
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        'pos' in value,
    );
}

// A name the parser synthesized during recovery has an empty spelling and no
// range, and is left out.
function collectNames(node: Node, out: Map<Name, NameFact[]>): void {
  if ('kind' in node && node.kind === NodeKind.Name) {
    const name = node as Name;
    if (name.value !== '') {
      out.set(name, []);
    }
    return;
  }
  childNodes(node).forEach(child => collectNames(child, out));
}
