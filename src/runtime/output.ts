// Arrow fields own output names, shapes and write modes; declarations own only execution facts.

import {Bool, Field, Float64, Schema, TimestampMillisecond} from 'apache-arrow';

/**
 * One output row of a run: the row's position and status, then one field per
 * output of the script, in the order of the module's output schema.
 *
 * - An `emit` output holds the value written on this step, or `null` when
 *   the statement did not run on this step. A numeric `na` is `NaN`; any
 *   other `na` is `null`.
 * - An `emit.append` output holds an array of the values appended on this
 *   step, in the order they were appended; it is empty when none were.
 * - A `plot()` output holds an object with the call's arguments under their
 *   parameter names, such as `series`, `title` and `color`. A color is an
 *   object `{r, g, b, a}` with values from 0 to 255, or `null` for `na`.
 *
 * A Datum and its values are frozen copies, so they stay valid after later
 * steps.
 *
 * @example With `close` at 10, a script with `emit "price" close` and
 * `emit.append "fills" "buy"` publishes
 * `{index: 0, timed: false, provisional: false, price: 10, fills: ['buy']}`.
 */
export interface Datum extends Readonly<Record<string, unknown>> {
  /**
   * The bar this row belongs to: 0 for the first bar, then one more for each
   * bar after it.
   *
   * A provisional update carries the index of the bar it updates, so several
   * rows can share an index; the row that finalizes that bar has it too.
   */
  readonly index: number;
  /**
   * The input row's time, in epoch milliseconds: absent when the input is not
   * timed or the row has no time, and `null` when the row's time is null.
   */
  readonly time?: number | null;
  /** Whether this row is a provisional update that a later row replaces. */
  readonly provisional: boolean;
  /** Whether `time` is present, including when it is `null`. */
  readonly timed: boolean;
}

/**
 * Builds an output schema: the row fields `index`, `time`, `timed` and
 * `provisional`, followed by `fields`.
 *
 * Each call creates new row fields, so changing their metadata in one schema
 * never affects another.
 *
 * @example `outputSchema([price]).fields[0].name` is `index`, and
 * `fields[4]` is `price`.
 */
export function outputSchema(fields: readonly Field[]): Schema {
  return new Schema([
    new Field('index', new Float64(), false),
    new Field('time', new TimestampMillisecond(), true),
    new Field('timed', new Bool(), false),
    new Field('provisional', new Bool(), false),
    ...fields,
  ]);
}

/**
 * Return fields written by the program, excluding execution coordinates.
 * Write mode is explicit: a List may be assigned as a value or appended to.
 * @example `outputFields(module.outputs.schema)[0].metadata.get('tea:write')`
 * is `set` for a price and `append` for an event list.
 */
export function outputFields(schema: Schema): readonly Field[] {
  return schema.fields.filter(field => field.metadata.has('tea:write'));
}

/**
 * Attach execution coordinates to detached output cells. No output schema or
 * payload conversion is reconstructed here; cells already match their fields.
 * @example An append cell `['buy']` becomes the value of its named column.
 */
export function createDatum(
  schema: Schema,
  index: number,
  result: {readonly outputs: readonly unknown[]; readonly provisional: boolean},
  time?: number | null,
): Datum {
  return Object.freeze({
    index,
    ...(time === undefined ? {} : {time}),
    timed: time !== undefined,
    provisional: result.provisional,
    ...Object.fromEntries(
      outputFields(schema).map((field, i) => [field.name, result.outputs[i]]),
    ),
  });
}
