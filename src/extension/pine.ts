// Purpose: Concrete Pine contextual values derived from public Node inputs.

import {BindError} from '../runtime/errors';
import type {Builtin} from '../runtime/module-abi';
import type {Module} from '../runtime/module-binding';
import type {Stored} from '../runtime/value';

/**
 * Returns the supplier of Pine's per-bar values, such as `bar_index`, `time`,
 * `timenow` and the `barstate.*` flags, for {@link createNode}.
 *
 * The {@link tea} template installs one with the default callbacks; pass one
 * to {@link createNode} when calling it directly, or to supply your own clock
 * or realtime flag. A Node and each of its requests call the supplier on
 * every step with their own bar index and input row, and each call samples
 * `now` and `isRealtime` once; pass a constant function for a fixed time.
 *
 * | Builtin | Reads | Fails when |
 * | --- | --- | --- |
 * | `bar_index` | the bar's index | never |
 * | `time` | the row's `time` field | the row has no time |
 * | `timenow` | `now()` | `now()` is not a safe integer |
 * | `barstate.isfirst` | whether the bar's index is 0 | never |
 * | `barstate.isconfirmed` | whether `provisional` is not `true` | never |
 * | `barstate.isnew` | whether the row is the bar's first | never |
 * | `barstate.isrealtime` | `isRealtime()` | never |
 * | `barstate.ishistory` | the opposite of `isRealtime()` | never |
 * | `syminfo.*` | nothing: `na` | never |
 * | `timeframe.*` | nothing: `na`, or `false` for the `is*` flags | never |
 *
 * The bar's index is the one in {@link Datum}: 0 for the first bar, and the
 * same for every row of a bar. A failure throws {@link BindError} and fails
 * the run. The supplier checks `now()` on every call, even when the script
 * does not read `timenow`.
 *
 * `syminfo.*` and `timeframe.*` get real values only when the host fixes them
 * while binding the module: the second argument of `Module.bind` maps the
 * builtin's position in `module.inputs.builtins` to its value, which then
 * replaces what this supplier gives on every step.
 *
 * @param now Returns the time for `timenow`, in epoch milliseconds. Defaults
 * to `Date.now`.
 * @param isRealtime Returns whether the current bar is live, for
 * `barstate.isrealtime` and `barstate.ishistory`. Defaults to always `false`,
 * so every bar counts as history.
 * @returns The supplier to pass to {@link createNode}.
 *
 * @example For a module containing only `emit "now" timenow`,
 * `pineBuiltinSupplier(() => 1000)([], module, 0, {})` returns `[1000]`.
 * `pineBuiltinSupplier(Date.now, () => live)` reports realtime bars once the
 * host sets `live`.
 */
export function pineBuiltinSupplier(
  now: () => number = Date.now,
  isRealtime: () => boolean = () => false,
) {
  return (
    _path: readonly number[],
    module: Module,
    index: number,
    datum: Readonly<Record<string, unknown>>,
  ): readonly Stored[] => {
    const timeNow = now();
    if (!Number.isSafeInteger(timeNow)) {
      throw new BindError('Pine timenow must be an exact epoch-ms integer');
    }
    const realtime = isRealtime();
    return module.inputs.builtins.map(spec =>
      builtinValue(spec, index, datum, timeNow, realtime),
    );
  };
}

function builtinValue(
  spec: Builtin,
  index: number,
  datum: Readonly<Record<string, unknown>>,
  timeNow: number,
  realtime: boolean,
): Stored {
  const source = spec.source;
  let value: Stored;
  switch (source.domain) {
    case 'time':
      switch (source.field) {
        case 'time':
          value = eventTime(datum.time, 'time');
          break;
        case 'timenow':
          value = timeNow;
          break;
      }
      break;
    case 'bar':
      value = index;
      break;
    case 'barstate':
      switch (source.field) {
        case 'isfirst':
          value = index === 0;
          break;
        case 'isrealtime':
          value = realtime;
          break;
        case 'ishistory':
          value = !realtime;
          break;
        case 'isconfirmed':
          value = datum.provisional !== true;
          break;
        case 'isnew':
          value = datum.firstAttempt !== false;
          break;
      }
      break;
    case 'syminfo':
    case 'timeframe':
      value = spec.empty.value as Stored;
      break;
  }
  spec.empty.assertStored(value);
  return value;
}

function eventTime(value: unknown, field: 'time'): number {
  if (value === undefined || value === null) {
    throw new BindError(
      `Pine ${field} requires an exact bigint epoch-ms input`,
    );
  }
  if (typeof value !== 'bigint') {
    throw new BindError(
      `Pine ${field} requires an exact bigint epoch-ms input`,
    );
  }
  const time = Number(value);
  if (!Number.isSafeInteger(time) || BigInt(time) !== value) {
    throw new BindError(`Pine ${field} must be an exact epoch-ms integer`);
  }
  return time;
}
