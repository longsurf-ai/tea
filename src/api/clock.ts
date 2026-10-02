/**
 * Clock algebra for time series manipulation.
 *
 * Clock algebra deals with the reasoning of presence of discrete
 * time series data. It helps answering questions like:
 * * Give time series x, y with different time cadence, how to combine them? what semantics are available?
 *
 */

declare const clock: unique symbol;

/**
 * A regular sampling period in nanoseconds, or {@link i} when the period is
 * irregular or unknown. A {@link DataStream} carries one Clock.
 *
 * Build a period by multiplying a unit constant, as in `(5n * m) as Clock`, or
 * convert a Tea timeframe with {@link timeframeClock}. A Clock describes
 * cadence only; event time travels in a `time` field.
 *
 * Binding requires every root stream clock other than `i` to agree, and
 * `Node.to()` throws when a request child's clock and its request
 * timeframe's clock are both known and differ. Unless both streams carry
 * event time, a collect request groups `parentClock / childClock` child
 * values per parent step when both clocks are known and divide exactly.
 */
export type Clock = bigint & {
  readonly [clock]: true;
};

/**
 * The irregular or unknown clock, `0n`. Clock checks skip it, and it never
 * sets a collect group size.
 */
export const i: Clock = 0n as Clock;
/** One nanosecond, the Clock unit (`1n`). */
export const ns: Clock = 1n as Clock;
/** One microsecond: 1,000 nanoseconds. */
export const us: Clock = (1000n * ns) as Clock;
/** One millisecond: 1,000 microseconds. */
export const ms: Clock = (1000n * us) as Clock;
/** One second: 1,000 milliseconds. */
export const s: Clock = (1000n * ms) as Clock;
/** One minute: 60 seconds. */
export const m: Clock = (60n * s) as Clock;
/** One hour: 60 minutes. */
export const h: Clock = (60n * m) as Clock;
/** One day: 24 hours. */
export const d: Clock = (24n * h) as Clock;
/** One week: 7 days. */
export const w: Clock = (7n * d) as Clock;
/** One month, fixed at 30 days. */
export const M: Clock = (30n * d) as Clock;
/** One year, fixed at 360 days. */
export const y: Clock = (360n * d) as Clock;

/** Convert one concrete Tea timeframe to its regular clock, or `i`. */
export function timeframeClock(timeframe: string): Clock {
  const match = /^([1-9]\d*)?([SDWM])$/.exec(timeframe);
  if (/^[1-9]\d*$/.test(timeframe)) {
    return (BigInt(timeframe) * m) as Clock;
  }
  if (match === null) return i;
  const count = BigInt(match[1] ?? '1');
  const unit =
    match[2] === 'S' ? s : match[2] === 'D' ? d : match[2] === 'W' ? w : M;
  return (count * unit) as Clock;
}
