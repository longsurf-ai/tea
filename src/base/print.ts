// Purpose: User-facing compile errors — queued at report time with per-line suppression, sorted and deduped at flush; internal invariant violations abort via fatal() and never queue.

/**
 * Compiler diagnostics. Pass a new {@link Errors} to `compileToProgram` or
 * `compileForTooling` from `tea/compiler`, then read its {@link ErrorMsg}
 * batch with `flushErrors()`. {@link InternalError} marks a compiler defect,
 * which is thrown rather than reported.
 *
 * @packageDocumentation
 */

import type {Pos} from './pos';

/**
 * The reporting callback the scanner and parser receive. They call it for
 * each problem and continue with recovery instead of throwing; the compiler
 * forwards each call to `errorAt()` of the compilation's {@link Errors}.
 *
 * @example `const report: ErrorHandler = (pos, msg) => errors.errorAt(pos, msg);`
 */
export type ErrorHandler = (pos: Pos, msg: string) => void;

/**
 * One user-facing compile error: `msg` at `pos`.
 *
 * `pos.base.filename` names the file; `pos.line` and `pos.col` are 1-based,
 * with columns counted in UTF-16 code units.
 *
 * @example `{pos: {base: {filename: 'rsi.tea'}, line: 1, col: 8}, msg: "expected expression, found 'newline'"}`
 * is the error for `x = 1 +` on the first line of `rsi.tea`.
 */
export interface ErrorMsg {
  readonly pos: Pos;
  readonly msg: string;
}

// @agent invariant: one Errors instance per compilation, owned by the driver
// (compiler.ts) or the CLI. User-facing errors are never thrown and never
// printed at the report site — they queue here and surface exactly once via
// flushErrors(). Invariant violations use fatal()/unimplemented() instead and
// must never queue.
/**
 * The queue of one compilation's user-facing errors.
 *
 * Create one per compilation and pass it to every stage: stages report into
 * it and keep going, the compiler reads `count` to skip the stages after a
 * failed one, and the caller collects the batch with `flushErrors()`.
 * Nothing is printed or thrown when an error is reported.
 *
 * Flush it before reusing it. `compileToProgram` returns `null` whenever
 * `count` is not zero, so errors left from an earlier compilation make a
 * later compilation of valid source return `null` without a new error.
 *
 * @example
 * ```ts
 * const errors = new Errors();
 * const program = compileToProgram(['rsi.tea'], errors);
 * if (program === null) console.error(errors.flushErrors());
 * ```
 */
export class Errors {
  private queued: ErrorMsg[] = [];
  // The last queued position: consecutive reports on one source line keep
  // only the first, no matter how confused a recovering parse gets.
  private last: Pos | null = null;

  /**
   * Queue `msg` at `pos`. A report on the same file and line as the
   * previously queued one is dropped, so a parser that recovers poorly on one
   * line adds a single error for it.
   * @example `errors.errorAt(pos, "expected expression, found 'newline'")`
   */
  errorAt(pos: Pos, msg: string): void {
    if (
      this.last !== null &&
      this.last.base === pos.base &&
      this.last.line === pos.line
    ) {
      return;
    }
    this.last = pos;
    this.queued.push({pos, msg});
  }

  /**
   * The number of errors queued since the last flush.
   * @example `errors.count > 0` after a failed stage.
   */
  get count(): number {
    return this.queued.length;
  }

  /**
   * Return the queued errors sorted by filename, line and column, with exact
   * duplicates removed, and empty the queue.
   * @example After `compileForTooling` on `x = 1 +\ny = close + "a"\n`,
   * `errors.flushErrors()` returns the line 1 parse error, then the line 2
   * type error; a second call returns `[]`.
   */
  flushErrors(): ErrorMsg[] {
    const sorted = [...this.queued].sort(
      (a, b) =>
        a.pos.base.filename.localeCompare(b.pos.base.filename) ||
        a.pos.line - b.pos.line ||
        a.pos.col - b.pos.col,
    );
    this.queued = [];
    this.last = null;
    return sorted.filter((e, i) => {
      if (i === 0) {
        return true;
      }
      const prev = sorted[i - 1];
      return (
        e.msg !== prev.msg ||
        e.pos.base !== prev.pos.base ||
        e.pos.line !== prev.pos.line ||
        e.pos.col !== prev.pos.col
      );
    });
  }
}

/**
 * A defect in Tea: one of its own checks failed in the compiler or at run time.
 *
 * It is thrown, never queued in {@link Errors}, and its message starts with
 * `internal compiler error: `. A feature Tea does not implement yet, such as
 * compiling more than one entry file, throws one too, with a message ending
 * in `is not implemented yet`. A host should report it as a problem in Tea
 * rather than in the user's source.
 *
 * @example `error instanceof InternalError` separates a Tea bug from bad input.
 */
export class InternalError extends Error {
  constructor(msg: string) {
    super(`internal compiler error: ${msg}`);
    this.name = 'InternalError';
  }
}

/**
 * Throw an {@link InternalError} for a state the compiler's own invariants
 * rule out. User errors go to {@link Errors} instead. The `never` return type
 * lets a call stand where a value is expected.
 *
 * @example `if (runtime === null) return fatal('request child has no runtime');`
 */
export function fatal(msg: string): never {
  throw new InternalError(msg);
}
