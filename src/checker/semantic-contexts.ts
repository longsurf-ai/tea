// Purpose: Tooling queries over a checked package — every semantic context, and the calls in given files that reach an error reported in another file.

import type {ErrorMsg} from '../base/print';
import type {Pos} from '../base/pos';
import type {CallExpr} from '../syntax/nodes';
import type {CheckedPackage, Info} from './check';
import {CallKind, type FunctionInstance} from './info';
import {ObjectKind} from './object';

/**
 * Every `Info` of the compilation, libraries included. A function body is
 * checked once per called signature, a generic struct once per
 * specialization, and a request capture in an `Info` of its own that only
 * the owning call reaches. A query that must see every fact about a node,
 * whatever context recorded it, iterates this.
 *
 * @example
 * ```ts
 * // Where `object` is defined, in this document or in a library.
 * for (const info of semanticContexts(analysis.checked)) {
 *   for (const [name, defined] of info.defs) {
 *     if (defined === object) found.add(name);
 *   }
 * }
 * ```
 */
export function semanticContexts(checked: CheckedPackage): Set<Info> {
  const infos = new Set<Info>([checked.info]);
  for (const [pkg, context] of checked.packageContexts) {
    infos.add(context.info);
    for (const object of pkg.scope.declared()) {
      if (object.kind === ObjectKind.GenericStruct) {
        infos.add(object.validationInfo);
        object.instances.forEach(instance => infos.add(instance.info));
      }
    }
  }
  for (const instances of checked.instances.values()) {
    instances.forEach(instance => infos.add(instance.info));
  }
  // A Set also iterates the entries added while iterating, which follows
  // captures nested in captures.
  for (const info of infos) {
    for (const call of info.calls.values()) {
      if (call.kind === CallKind.Request) {
        infos.add(call.capture);
      }
    }
  }
  return infos;
}

/**
 * The calls written in `filenames` that enter another file and reach the
 * function instance where `error` was reported. A function body is checked
 * once per called signature, so an argument the body cannot use is reported
 * inside the body, often in a library the reader never opened. The culprit is
 * the instance whose check reported the error; these are the calls a reader
 * can change.
 *
 * Empty when no such call reaches the error, as for an error at the top of an
 * imported file.
 *
 * @example
 * ```ts
 * // For `e = ta.ema("a", 14)`, the error sits inside ta.tea.
 * callsReaching(error, checked, new Set(['script.tea'])); // [the ta.ema call]
 * ```
 */
export function callsReaching(
  error: ErrorMsg,
  checked: CheckedPackage,
  filenames: ReadonlySet<string>,
): CallExpr[] {
  const samePos = (pos: Pos): boolean =>
    pos.base.filename === error.pos.base.filename &&
    pos.line === error.pos.line &&
    pos.col === error.pos.col;
  const culprits = new Set<FunctionInstance>();
  for (const instances of checked.instances.values()) {
    for (const instance of instances) {
      if (instance.info.errors.some(samePos)) culprits.add(instance);
    }
  }
  const reaches = (instance: FunctionInstance): boolean =>
    culprits.has(instance) ||
    [...instance.info.calls.values()].some(
      call => call.kind === CallKind.Function && reaches(call.instance),
    );
  const calls: CallExpr[] = [];
  for (const info of semanticContexts(checked)) {
    for (const [call, resolution] of info.calls) {
      if (
        filenames.has(call.pos.base.filename) &&
        resolution.kind === CallKind.Function &&
        !filenames.has(resolution.instance.template.decl.pos.base.filename) &&
        reaches(resolution.instance) &&
        !calls.includes(call)
      ) {
        calls.push(call);
      }
    }
  }
  return calls;
}
