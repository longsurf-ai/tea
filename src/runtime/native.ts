// Purpose: Scalar Tea intrinsics shared by handwritten and generated programs.

import {fatal} from '../base/print';
import {ExecutionError} from './errors';
import {Color} from './color';
import type {Scalar} from './value';
import {Value, bool, color, float, int, text, type Numeric} from './js/value';

function numeric<N extends Numeric>(value: number, kind: N): Value<number, N> {
  return new Value(Number.isFinite(value) ? value : NaN, kind);
}

function round(x: Value<number, Numeric>): Value<number, 'int'>;
function round(
  x: Value<number, Numeric>,
  precision: Value<number, 'int'>,
): Value<number, 'float'>;
function round(x: Value<number, Numeric>, precision?: Value<number, 'int'>) {
  if (precision === undefined) return int(Math.round(x.value));
  const scale = Math.pow(10, precision.value);
  return float(Math.round(x.value * scale) / scale);
}

/**
 * Numeric intrinsics preserve Tea's result kind and normalize overflow to NA.
 * @example `math.round(float(1.235), int(2)).value` is 1.24.
 */
export const math = {
  abs<N extends Numeric>(x: Value<number, N>): Value<number, N> {
    return numeric(Math.abs(x.value), x.kind);
  },
  sign<N extends Numeric>(x: Value<number, N>): Value<number, N> {
    return numeric(Math.sign(x.value), x.kind);
  },
  floor: (x: Value<number, Numeric>) => int(Math.floor(x.value)),
  ceil: (x: Value<number, Numeric>) => int(Math.ceil(x.value)),
  round,
  sqrt: (x: Value<number, Numeric>) => float(Math.sqrt(x.value)),
  // Math.pow(NaN, 0) is 1, but an na argument gives na.
  pow: (x: Value<number, Numeric>, y: Value<number, Numeric>) =>
    float(
      Number.isNaN(x.value) || Number.isNaN(y.value)
        ? NaN
        : Math.pow(x.value, y.value),
    ),
  log: (x: Value<number, Numeric>) => float(Math.log(x.value)),
  log10: (x: Value<number, Numeric>) => float(Math.log10(x.value)),
  exp: (x: Value<number, Numeric>) => float(Math.exp(x.value)),
  max<N extends Numeric>(
    ...values: readonly Value<number, N>[]
  ): Value<number, N> {
    return numeric(
      Math.max(...values.map(x => x.value)),
      values.some(x => x.kind === 'float') ? 'float' : 'int',
    ) as Value<number, N>;
  },
  min<N extends Numeric>(
    ...values: readonly Value<number, N>[]
  ): Value<number, N> {
    return numeric(
      Math.min(...values.map(x => x.value)),
      values.some(x => x.kind === 'float') ? 'float' : 'int',
    ) as Value<number, N>;
  },
  avg: (...values: readonly Value<number, Numeric>[]) =>
    float(values.reduce((sum, x) => sum + x.value, 0) / values.length),
};

/**
 * Colors reuse the canonical encoding also used by constant folding.
 * @example `colors.rgb(int(255), int(0), int(0)).value?.toString()` is '#FF0000'.
 */
export const colors = {
  new(
    value: Value<Color | null, 'color'>,
    transparency: Value<number, Numeric>,
  ) {
    return color(
      value.value === null || !Number.isFinite(transparency.value)
        ? null
        : value.value.withTransparency(transparency.value),
    );
  },
  rgb(
    r: Value<number, Numeric>,
    g: Value<number, Numeric>,
    b: Value<number, Numeric>,
    transparency?: Value<number, Numeric>,
  ) {
    const channels = [r.value, g.value, b.value, transparency?.value ?? 0];
    return color(
      channels.every(Number.isFinite)
        ? Color.rgb(r.value, g.value, b.value, transparency?.value ?? 0)
        : null,
    );
  },
};

/**
 * Tea's `str` intrinsics for generated and handwritten programs.
 *
 * `str.tostring(value, titles?)` formats a captured value as a Tea string: a
 * missing value (`null` or `NaN`) becomes `'NaN'`, an enum member listed in
 * `titles` (`[name, title]` pairs, which generated code passes for enum
 * values) becomes its title, and anything else uses JavaScript `String()`, so
 * colors format as canonical hex.
 *
 * @example
 * ```ts
 * str.tostring(float(2.5)).value; // '2.5'
 * str.tostring(int(NaN)).value; // 'NaN'
 * ```
 */
export const str = {
  tostring(
    value: Value<unknown>,
    titles: readonly (readonly [string, string])[] = [],
  ) {
    const raw = value.value;
    return text(
      raw === null || Number.isNaN(raw)
        ? 'NaN'
        : (titles.find(([name]) => name === raw)?.[1] ?? String(raw)),
    );
  },
};

/**
 * `runtime.error(message)`: stops the run with an {@link ExecutionError} whose
 * code is `RUNTIME_ERROR` and whose message is the script's.
 *
 * @example `runtime.error(text('length must be at least 1'))` throws
 * `RUNTIME_ERROR: length must be at least 1`.
 */
export const runtime = {
  error(message: Value<string | null, 'string'>): never {
    throw new ExecutionError('RUNTIME_ERROR', message.value ?? 'na');
  },
};

/** Numeric NA is NaN, nullable NA is null, and booleans have no NA value. */
export function na(value: Value<unknown>): Value<boolean, 'bool'> {
  return bool(value.value === null || Number.isNaN(value.value));
}

/** Use the replacement only when the captured value is missing. */
export function nz<T, K extends string>(
  value: Value<T, K>,
  replacement?: Value<T, K>,
): Value<T, K> {
  if (!na(value).value) return value;
  if (replacement !== undefined) return replacement;
  const raw =
    value.kind === 'int' || value.kind === 'float'
      ? 0
      : value.kind === 'string'
        ? ''
        : value.kind === 'color'
          ? new Color(0, 0, 0, 0)
          : fatal(`nz requires a replacement for ${value.kind}`);
  return new Value(raw as T, value.kind);
}

/** Invalid offsets demand no retained history. */
export function historyDepth(
  value: Value<number, Numeric>,
): Value<number, 'int'> {
  return int(
    Number.isSafeInteger(value.value) && value.value >= 0 ? value.value : 0,
  );
}

/** Stop a range whose floating-point step can no longer advance its index. */
export function rangeNext<N extends Numeric>(
  x: Value<number, N>,
  step: Value<number, N>,
): Value<number, N> {
  const next = x.value + step.value;
  return numeric(
    (step.value > 0 && next > x.value) || (step.value < 0 && next < x.value)
      ? next
      : NaN,
    x.kind,
  );
}

/**
 * Read a bind-visible builtin inside a module's generated binding
 * calculation; hosts supply these values through {@link Module.bind} rather
 * than calling this.
 *
 * Throws when `values` has no entry for `id`. `Module.bind` treats that error
 * as context not supplied yet: the configuration stays incomplete instead of
 * failing or keeping stale results. Execution-only builtins, which change per
 * row, never have a value here.
 *
 * @internal
 */
export function contextValue(
  values: ReadonlyMap<number, Scalar> | undefined,
  id: number,
  name: string,
): Scalar {
  if (values === undefined || !values.has(id)) {
    throw new Error(`builtin '${name}' is not bind-visible`);
  }
  return values.get(id)!;
}
