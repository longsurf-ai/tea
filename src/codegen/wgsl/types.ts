// Purpose: WGSL compiler diagnostics. The versioned physical artifact contract
// is neutral and shared with the runtime through gpu/contract.

export * from '../../gpu/contract';
import type {CompiledWgslProgram} from '../../gpu/contract';

/**
 * The compiler stage that reported an eligibility issue.
 *
 * Emission is the single capability walk, so every issue currently reports
 * `'wgsl-emission'`.
 */
export type WgslEligibilityPhase =
  | 'semantic-contract'
  | 'physical-layout'
  | 'host-plan'
  | 'wgsl-emission';

/**
 * Stable identifier of the construct that kept a Program off the GPU.
 *
 * For example, `struct-reference-lowering-unimplemented` reports a struct
 * value and `series-row-count-unavailable` a program without numeric series
 * inputs. Branch on the code; the issue's `message` explains the specific
 * occurrence.
 */
export type WgslEligibilityIssueCode =
  | 'numeric-contract-unresolved'
  | 'nullable-value-layout-unimplemented'
  | 'struct-reference-lowering-unimplemented'
  | 'enum-layout-unimplemented'
  | 'tuple-layout-unimplemented'
  | 'collection-layout-unimplemented'
  | 'host-value-type-unsupported'
  | 'series-row-count-unavailable'
  | 'parameter-packing-unimplemented'
  | 'request-execution-unimplemented'
  | 'bind-stage-unimplemented'
  | 'history-layout-unimplemented'
  | 'builtin-mapping-unimplemented'
  | 'persistent-state-initialization-unimplemented'
  | 'function-frame-lowering-unimplemented'
  | 'method-frame-lowering-unimplemented'
  | 'native-call-lowering-unimplemented'
  | 'aggregate-operation-lowering-unimplemented'
  | 'tuple-operation-lowering-unimplemented'
  | 'collection-operation-lowering-unimplemented'
  | 'loop-lowering-unimplemented'
  | 'result-transport-lowering-unimplemented'
  | 'effect-transport-lowering-unimplemented'
  | 'wgsl-emitter-unimplemented';

/** Source position of an eligibility issue: file name and 1-based line and column. */
export interface WgslSourceLocation {
  readonly filename: string;
  readonly line: number;
  readonly column: number;
}

/** One reason a Program cannot compile to WGSL. */
export interface WgslEligibilityIssue {
  readonly code: WgslEligibilityIssueCode;
  readonly phase: WgslEligibilityPhase;
  /** Human-readable explanation naming the specific value, type or call. */
  readonly message: string;
  /**
   * How many times the construct occurs. Compilation stops at the first one,
   * so this is currently always 1.
   */
  readonly occurrences: number;
  /**
   * Where the construct first occurs, or `null` when it has no single source
   * position, such as a struct type reached through an output.
   */
  readonly firstLocation: WgslSourceLocation | null;
}

/**
 * Counts of the Program features GPU lowering must place.
 *
 * They are taken before lowering starts, so they are present even when
 * compilation fails.
 */
export interface WgslProgramInventory {
  /** Parameters a host can set, such as `input.int` declarations. */
  readonly parameterCount: number;
  /** Requests: child programs evaluated in another symbol or timeframe. */
  readonly requestCount: number;
  /** Numeric series inputs, such as `close`. */
  readonly seriesInputCount: number;
  /** Contextual builtin inputs, such as `timeframe.multiplier`. */
  readonly builtinInputCount: number;
  /** Reachable `var` and `varip` declarations, including those inside functions. */
  readonly persistentRootCount: number;
  /** Reachable functions, including library functions such as `plot`. */
  readonly functionCount: number;
  /** Reachable methods that may mutate their receiver (no trailing `const`). */
  readonly mutableMethodCount: number;
  /** One more than the highest call-site slot used by any function call. */
  readonly callSiteSlotCount: number;
  /** Outputs of both write modes, `emit` and `emit.append`. */
  readonly outputCount: number;
  /** Set (`emit`) outputs; on the GPU each needs one result cell per row. */
  readonly resultChannelCount: number;
}

/**
 * Whether a Program can compile to WGSL, with the reason when it cannot.
 *
 * `issues` is empty exactly when `eligible` is true; otherwise it holds the
 * construct that stopped compilation. `inventory` is present either way.
 */
export interface WgslEligibilityReport {
  readonly eligible: boolean;
  readonly inventory: WgslProgramInventory;
  readonly issues: readonly WgslEligibilityIssue[];
}

/**
 * Outcome of {@link compileProgramToWgsl}: `'compiled'` with a complete
 * {@link CompiledWgslProgram}, or `'staged-unsupported'` with `artifact: null`
 * and an ineligible report.
 *
 * There is never a partial artifact.
 */
export type WgslCompilationResult =
  | {
      readonly status: 'staged-unsupported';
      readonly eligibility: WgslEligibilityReport;
      readonly artifact: null;
    }
  | {
      readonly status: 'compiled';
      readonly eligibility: WgslEligibilityReport & {readonly eligible: true};
      readonly artifact: CompiledWgslProgram;
    };
