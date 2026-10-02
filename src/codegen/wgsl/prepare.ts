// Purpose: Public fail-closed WGSL capability report projected from the authoritative Program compiler.

import type {Program} from '../../ir/program';
import {compileProgramToWgsl} from './lower';
import type {WgslEligibilityReport} from './types';

/**
 * Report whether a checked Program can run on the GPU, without keeping an
 * artifact.
 *
 * Compilation is the single capability walk: this runs the full
 * {@link compileProgramToWgsl} and returns only its eligibility, so reporting
 * never maintains a parallel support table that can drift from the emitter.
 *
 * @param program - A checked Program, as returned by {@link compileToProgram}.
 * @returns An eligible report with no issues, or an ineligible report naming
 * the construct that stopped compilation.
 *
 * @example
 * ```ts
 * const report = analyzeWgslEligibility(program);
 * if (!report.eligible) console.log(report.issues[0]?.code);
 * // For plot("price", close): 'struct-reference-lowering-unimplemented'
 * ```
 */
export function analyzeWgslEligibility(
  program: Program,
): WgslEligibilityReport {
  return compileProgramToWgsl(program).eligibility;
}

export type {
  WgslEligibilityIssue,
  WgslEligibilityIssueCode,
  WgslEligibilityPhase,
  WgslEligibilityReport,
  WgslProgramInventory,
  WgslSourceLocation,
} from './types';
