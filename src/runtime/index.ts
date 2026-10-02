// Public typed execution library, independent of the Tea frontend and Node host.

/**
 * The typed execution library that compiler-generated TypeScript imports, also
 * usable from handwritten TypeScript: {@link Module}, {@link Context}, captured
 * {@link Value} constructors, collections and the Arrow schema constructors.
 *
 * Most hosts run programs through {@link Node} from `tea` instead. A host that
 * already owns synchronized rows starts from a generated {@link Module} (the
 * default export of a `tea build` file, or the result of {@link loadModule}):
 * bind it with {@link Module.bind}, create a {@link Context}, and call
 * {@link Context.step} once per row.
 *
 * @packageDocumentation
 */

export {Module, type ModuleInputs} from './module-binding';
export {Color} from './color';
export {Context, type StepInput, type StepResult} from './js/context';
export {Input, Series} from './js/series';
export {
  type Value,
  type Numeric,
  int,
  float,
  bool,
  text,
  color,
  enumeration,
  resource,
  struct,
  array,
  matrix,
  map,
  tuple,
} from './js/value';
export * from './native';
export {decodeSchema, encodeSchema, cloneSchema} from './io';
export {outputSchema} from './output';
export type {Ref} from './js/heap';
export type {
  ArrayValue,
  MatrixValue,
  MapValue,
  ResourceHandle,
  Scalar,
} from './value';

export {RUNTIME_ABI_VERSION, type Frame} from './module-abi';

// loadModule() lets generated code import only 'tea/runtime', so the Arrow
// constructors its schemas use are re-exported here unchanged.
export {
  /** Apache Arrow `Schema`: the ordered fields of a module's inputs or outputs. */
  Schema,
  /**
   * Apache Arrow `Field`: one named, typed column. Tea facts such as
   * `tea:type` and `tea:write` live in its metadata.
   */
  Field,
  /**
   * Apache Arrow `Float64`: the type of Tea int and float values, the `index`
   * coordinate and resource ids.
   */
  Float64,
  /** Apache Arrow `Uint8`: the type of each color channel (`r`, `g`, `b`, `a`). */
  Uint8,
  /**
   * Apache Arrow `Bool`: the type of Tea bool values and the `timed` and
   * `provisional` coordinates.
   */
  Bool,
  /** Apache Arrow `Utf8`: the type of Tea strings and enum members. */
  Utf8,
  /**
   * Apache Arrow `List`: the type of Tea arrays, matrix values and
   * append-output columns.
   */
  List,
  /**
   * Apache Arrow `Struct`: the type of Tea colors, structs, tuples, matrices
   * and resources.
   */
  Struct,
  /**
   * Apache Arrow `Map_`: the type of Tea maps, whose keys are non-null and keep
   * insertion order.
   */
  Map_,
  /**
   * Apache Arrow `TimestampMillisecond`: the type of event time, such as the
   * `time` coordinate.
   */
  TimestampMillisecond,
} from 'apache-arrow';
