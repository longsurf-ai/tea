// Purpose: Pipeline driver — sole owner of stage order, phase barriers, and the per-compilation Errors instance: loadPackage (parse) → checkPackage (typecheck) → buildProgram (noding) → generate (lowering).

/**
 * The Tea compiler, for hosts that compile without the {@link tea} template.
 * Start with {@link compileToProgram}, which turns source files or in-memory
 * text into the `Program` that {@link generate} lowers to a module's source
 * and {@link loadModule} turns into a `Module` for `createNode`.
 * {@link compile} runs the whole `tea build` path for files on disk, and
 * {@link compileForTooling} keeps every stage's result for editors. Source
 * diagnostics are never thrown: they collect in the {@link Errors} instance
 * the caller passes, or in the result of {@link compile}. A thrown
 * {@link InternalError} is a defect in Tea or a feature it does not implement
 * yet.
 *
 * @packageDocumentation
 */

import {log} from './base/log';
import {formatPos} from './base/pos';
import {Errors, type ErrorMsg} from './base/print';
import {generate} from './codegen/codegen';

export {Errors, InternalError, type ErrorMsg} from './base/print';
export {generate} from './codegen/codegen';
export {loadModule} from './runtime/load';
import {checkGenerated} from './codegen/check';
import type {Program} from './ir/program';
import {checkPackage, type CheckedPackage} from './checker/check';
import {callsReaching} from './checker/semantic-contexts';
import {
  loadPackage,
  resolveImports,
  readSourceFile,
  type SourceInput,
} from './loader/loader';
import {buildProgram} from './noder/noder';
import {NodeKind, type Expr, type File} from './syntax/nodes';

/**
 * The outcome of {@link compile}: the generated TypeScript module source, or
 * the flushed, position-ordered error batch. Never both, and never a partial
 * module.
 */
export type CompileResult =
  | {readonly ok: true; readonly source: string}
  | {readonly ok: false; readonly errors: readonly ErrorMsg[]};

// Compiler performance events, one per phase (TEA_LOG=debug shows them).
const perf = log.child('compile');

/**
 * One run of the frontend with every stage's result kept: what tooling reads
 * instead of the `Program` alone. The run's errors are in the `Errors` the
 * caller passed.
 */
export interface Compilation {
  /** The parsed entry files; partial where the parser recovered. */
  readonly files: readonly File[];
  /** Files reached by import resolution, including missing or invalid libraries. */
  readonly dependencies: readonly string[];
  /** Semantic facts, present even when parsing or checking reported errors. */
  readonly checked: CheckedPackage;
  /** Null unless parse, check and noding all finished without an error. */
  readonly program: Program | null;
  /**
   * Every text this run parsed, by filename: the entry files and each
   * library, compiler-shipped ones included. Tooling reads doc comments here.
   */
  readonly sources: ReadonlyMap<string, string>;
}

/** Source capture does not change compilation or import resolution. */
export interface CompileOptions {
  readonly includeSources?: boolean;
}

// The sole parse -> check -> node implementation, as two halves so that the
// parse barrier is the only thing the two entries below decide for
// themselves. Target lowerers consume its Program directly; no execution mode
// owns a parallel frontend.
function parseStage(
  inputs: readonly SourceInput[],
  errors: Errors,
  captured?: Map<string, string>,
): {files: File[]; sources: ReadonlyMap<string, string>} {
  const parseDone = perf.startTimer('parse');
  const sources = new Map<string, string>();
  const files = loadPackage(inputs, errors, sources);
  sources.forEach((source, filename) => captured?.set(filename, source));
  parseDone({files: files.length});
  return {files, sources};
}

function checkAndNode(
  {files, sources: entrySources}: ReturnType<typeof parseStage>,
  errors: Errors,
  inputs: readonly SourceInput[],
  captured?: Map<string, string>,
): Compilation {
  // Import resolution is a driver stage: the loader loads and orders
  // libraries; the checker consumes them through the Importer and positions
  // any resolution errors at the import statements.
  const checkDone = perf.startTimer('check');
  const supplied = new Map(
    inputs.flatMap(input =>
      typeof input === 'string'
        ? []
        : [
            [input.filename, input.source] as const,
            ...Object.entries(input.imports ?? {}),
          ],
    ),
  );
  const snapshot = inputs.some(
    input => typeof input !== 'string' && input.imports !== undefined,
  );
  const importer = resolveImports(
    files,
    undefined,
    undefined,
    undefined,
    filename => {
      const source =
        supplied.get(filename) ??
        (snapshot ? undefined : readSourceFile(filename));
      if (source !== undefined) captured?.set(filename, source);
      return source;
    },
  );
  const checked = checkPackage(files, errors, importer);
  const dependencies = [
    ...new Set([
      ...files.map(file => file.pos.base.filename),
      ...importer.files,
    ]),
  ];
  const sources = new Map([...entrySources, ...importer.sources]);
  checkDone();
  if (errors.count > 0) {
    return {files, checked, dependencies, program: null, sources};
  }
  const nodeDone = perf.startTimer('buildProgram');
  const program = buildProgram(checked, errors);
  nodeDone();
  return {
    files,
    checked,
    dependencies,
    program: errors.count > 0 ? null : program,
    sources,
  };
}

type ProgramWithSources = {
  readonly program: Program;
  readonly sources: Readonly<Record<string, string>>;
};

/**
 * Compiles one Tea script into the `Program` that {@link generate} turns into
 * module source.
 *
 * `inputs` holds one entry: a file path, read from disk, or an object
 * `{filename, source, imports?}` with the script's text in memory.
 *
 * - `filename` names the script in errors and is the base for its relative
 *   imports.
 * - `source` is the script's text.
 * - `imports` maps each file a relative import reaches to its text. A key is
 *   the importing file's directory joined with the import path plus `.tea`,
 *   normalized: `import ./lib/bands` in `scripts/main.tea` reads the key
 *   `scripts/lib/bands.tea`. With `imports`, a file missing from it is
 *   reported as not found and nothing is read from disk; without it, relative
 *   imports are read from disk. Shipped libraries such as `ta` are always
 *   available.
 *
 * Errors in the script and its imports are queued in `errors`, and the result
 * is `null` when there are any; compilation stops after the first stage that
 * reports one. An error that a script's call causes inside a library function
 * is reported at that call, with the library position in its message.
 * `errors` must be empty when the call starts: errors left from an earlier
 * compilation make this function return `null` even for valid source, so
 * flush them first.
 *
 * A host passes the `Program` to {@link generate} and may read
 * `program.declaration`: the script's `indicator()` header as
 * `{kind: 'indicator', title, overlay}`, or `null` without one. With
 * `includeSources: true` the result is `{program, sources}`, where `sources`
 * maps the script and each file it imports to the exact text compiled,
 * leaving out shipped libraries.
 *
 * Throws an `Error` that names the file when the entry path cannot be read,
 * such as `cannot read 'main.tea': no such file`. Throws an
 * {@link InternalError} for a defect in Tea, or when `inputs` does not hold
 * exactly one entry, which Tea does not support yet.
 *
 * @example
 * ```ts
 * const errors = new Errors();
 * const program = compileToProgram(
 *   [{filename: 'main.tea', source: 'emit "price" close', imports: {}}],
 *   errors,
 * );
 * if (program === null) console.error(errors.flushErrors());
 * ```
 * @example `compileToProgram(['main.tea'], errors, {includeSources: true})`
 * reads `main.tea` and its relative imports from disk and returns
 * `{program, sources}`.
 */
export function compileToProgram(
  inputs: readonly SourceInput[],
  errors: Errors,
  options: CompileOptions & {readonly includeSources: true},
): ProgramWithSources | null;
export function compileToProgram(
  inputs: readonly SourceInput[],
  errors: Errors,
  options?: CompileOptions & {readonly includeSources?: false},
): Program | null;
export function compileToProgram(
  inputs: readonly SourceInput[],
  errors: Errors,
  options: CompileOptions,
): Program | ProgramWithSources | null;
export function compileToProgram(
  inputs: readonly SourceInput[],
  errors: Errors,
  options: CompileOptions = {},
): Program | ProgramWithSources | null {
  const captured = options.includeSources
    ? new Map<string, string>()
    : undefined;
  const parsed = parseStage(inputs, errors, captured);
  if (errors.count > 0) return null;
  const {checked, program} = checkAndNode(parsed, errors, inputs, captured);
  if (program === null) {
    reportAtScriptCalls(errors, checked, parsed.files);
    return null;
  }
  return captured ? {program, sources: Object.fromEntries(captured)} : program;
}

/**
 * A library body is checked once per signature it is called with, so an
 * argument it cannot use is reported inside the library. Move each such error
 * onto the script calls that reached it, where the author can act, in the
 * form the language server shows: `in ta.ema (tea-lib/ta.tea:68:24): ...`.
 * When the called function reports an error itself, errors from the functions
 * it calls in turn are dropped for that call, so `ta.bb(close, 0, 2)` names
 * `ta.bb`'s own rule rather than that of the `ta.sma` inside it. An error no
 * script call reaches keeps its position.
 */
function reportAtScriptCalls(
  errors: Errors,
  checked: CheckedPackage,
  files: readonly File[],
): void {
  const scripts = new Set(files.map(file => file.pos.base.filename));
  const reports = errors.flushErrors().map(error => ({
    error,
    calls: scripts.has(error.pos.base.filename)
      ? []
      : callsReaching(error, checked, scripts),
  }));
  const reportsOwnError = new Set(
    reports.flatMap(({calls}) =>
      calls.filter(found => found.direct).map(found => found.call),
    ),
  );
  for (const {error, calls} of reports) {
    if (calls.length === 0) errors.errorAt(error.pos, error.msg);
    for (const {call, direct} of calls) {
      if (!direct && reportsOwnError.has(call)) continue;
      errors.errorAt(
        call.fun.pos,
        `in ${calleeName(call.fun)} (${formatPos(error.pos)}): ${error.msg}`,
      );
    }
  }
}

function calleeName(fun: Expr): string {
  if (fun.kind === NodeKind.Name) return fun.value;
  if (fun.kind === NodeKind.SelectorExpr) {
    return `${calleeName(fun.x)}.${fun.sel.value}`;
  }
  return 'call';
}

/**
 * The tooling entry: the same stages as {@link compileToProgram} without the
 * barrier after parsing, so a file that is broken on one line still yields
 * types, scopes and check errors for its other lines. The checker tolerates
 * the `BadExpr` and `BadStmt` nodes of a recovered parse. Noding keeps its
 * barrier and runs only when parse and check reported nothing.
 *
 * It is for editors and analysis only. Nothing that executes Tea may call it:
 * every backend consumes the `Program` of `compileToProgram`. `inputs`,
 * including `imports`, takes the same forms as there.
 *
 * User errors queue in `errors`; an `InternalError` thrown from here is a
 * defect in Tea or a feature it does not implement yet.
 *
 * @example
 * ```ts
 * const errors = new Errors();
 * const {files, checked} = compileForTooling(
 *   [{filename: 'rsi.tea', source: 'x = 1 +\ny = close + "a"\n'}],
 *   errors,
 * );
 * errors.flushErrors(); // the parse error on line 1 and the type error on line 2
 * ```
 */
export function compileForTooling(
  inputs: readonly SourceInput[],
  errors: Errors,
): Compilation {
  return checkAndNode(parseStage(inputs, errors), errors, inputs);
}

/**
 * Compile Tea files on disk to the TypeScript module source that `tea build`
 * writes.
 *
 * It runs {@link compileToProgram} with its own {@link Errors}, lowers the
 * Program with {@link generate}, and type-checks the result against the
 * installed `tea/runtime` declarations.
 *
 * Source diagnostics come back as `{ok: false, errors}`, sorted by position
 * and deduplicated, and stop compilation at the first failed stage. An
 * unreadable entry file throws an `Error` that names it. A generated module
 * that fails the type check throws {@link InternalError}: the frontend
 * accepted the program, so the failure is a compiler defect.
 *
 * @example
 * ```ts
 * import {writeFileSync} from 'node:fs';
 * import {compile} from 'tea/compiler';
 *
 * const result = compile(['rsi.tea']);
 * if (result.ok) {
 *   writeFileSync('rsi.ts', result.source);
 * } else {
 *   for (const {pos, msg} of result.errors) {
 *     console.error(`${pos.base.filename}:${pos.line}:${pos.col}: ${msg}`);
 *   }
 * }
 * ```
 */
export function compile(filenames: readonly string[]): CompileResult {
  const errors = new Errors();
  const program = compileToProgram(filenames, errors);
  if (program === null) {
    return {ok: false, errors: errors.flushErrors()};
  }
  const generateDone = perf.startTimer('generate');
  const source = generate(program);
  generateDone({bytes: source.length});
  checkGenerated(source);
  return {ok: true, source};
}
