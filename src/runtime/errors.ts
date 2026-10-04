// Purpose: User-facing runtime failures and execution control-flow errors.

import {OperationalError} from '../base/operational-error';

/**
 * Host-supplied configuration or input that the compiled program cannot
 * accept. It reports a mistake in the host's binding, never in Tea source.
 *
 * `Node.bind()` and `Module.bind()` throw it synchronously and leave the
 * receiver unchanged: for an unknown or ill-typed parameter, invalid fixed
 * context, a request path or stream name that matches no declaration or more
 * than one, or a stream whose schema lacks a required numeric series, repeats
 * a bound series, or disagrees with another bound stream's clock.
 * `Node.to()` throws it when a binding is still missing. During a run, Node
 * throws it for an input row that breaks the time, provisional or pairing
 * rules of `bind()`, and the Pine builtin supplier throws it when its clock
 * returns a value that is not a safe integer, or when the program reads
 * `time` from an input without an exact epoch-millisecond time; that error
 * fails the run and reaches its observers.
 *
 * @example
 * ```ts
 * const node = tea`
 *   length = input.int(14)
 *   emit "average" ta.sma(close, length)
 * `;
 * try {
 *   node.bind({length: 2.5});
 * } catch (error) {
 *   if (error instanceof BindError) console.error(error.message);
 *   // parameter 'length' expects a safe integer
 * }
 * ```
 */
export class BindError extends OperationalError {
  constructor(msg: string) {
    super(msg);
    this.name = 'BindError';
  }
}

export class RequestError extends OperationalError {
  constructor(msg: string) {
    super(msg);
    this.name = 'RequestError';
  }
}

export type ExecutionErrorCode =
  | 'NA_COLLECTION'
  | 'INDEX_OUT_OF_BOUNDS'
  | 'EMPTY_COLLECTION'
  | 'INVALID_SHAPE'
  | 'INVALID_MAP_KEY'
  | 'COLLECTION_LIMIT_EXCEEDED'
  | 'HEAP_LIMIT_EXCEEDED'
  | 'FIXED_VALUE_STORAGE_LIMIT_EXCEEDED'
  | 'NA_STRUCT_WRITE'
  | 'VALUE_LAYOUT_MISMATCH'
  | 'RUNTIME_ERROR';

export class ExecutionError extends OperationalError {
  constructor(
    readonly code: ExecutionErrorCode,
    msg: string,
  ) {
    super(`${code}: ${msg}`);
    this.name = 'ExecutionError';
  }
}
