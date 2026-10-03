/**
 * The JavaScript embedding API. Start with the {@link tea} template tag, which
 * compiles a program into a {@link Node}: bind parameters and
 * {@link DataStream} inputs with `bind()`, then observe {@link Datum} rows with
 * `to()`. {@link fromCSV}, {@link fromWS}, {@link CSVSink} and
 * {@link WebSocketSink} adapt files and sockets, and {@link batchRecipe} runs a
 * Node over finite data until it completes.
 *
 * @packageDocumentation
 */

export * from './api/index';
export {pineBuiltinSupplier} from './extension/pine';
export {batchRecipe, type BatchResult} from './recipe/batch';
export type {Recipe} from './recipe/recipe';
