/**
 * Turn generated TypeScript module source into a runtime `Module` inside the
 * current process. Start with {@link loadModule}, which the {@link tea}
 * template applies to the output of {@link generate}. The source runs as
 * code, with `tea/runtime` as the only module it may import.
 *
 * @packageDocumentation
 */

import type {Module} from './module-binding';
// Load the same ordinary TypeScript module written by the compiler.

import ts from 'typescript';
import * as runtime from './index';

/**
 * Loads generated TypeScript module source, such as the output of
 * {@link generate} or a file written by `tea build`, as a runtime `Module`.
 *
 * The result is unbound: no parameter has a value yet, so `remaining()` lists
 * every input. Call `bind()` to set values and fill in the defaults. Loading
 * runs no step and subscribes to nothing.
 *
 * The source is transpiled without type checking and then runs as ordinary
 * code in the current process, with no sandbox: it can use the same globals
 * and APIs as the host, so load only source you trust. The only module it
 * may import is `tea/runtime`.
 *
 * Throws:
 *
 * - `SyntaxError` when the source is not valid TypeScript;
 * - `Error` when it imports any module other than `tea/runtime`;
 * - `Error` when its default export is not a runtime `Module`;
 * - whatever the source itself throws while it runs, such as a
 *   {@link BindError} for a module generated for another runtime version.
 *
 * @example
 * ```ts
 * import {compileToProgram, Errors, generate, loadModule} from 'tea/compiler';
 *
 * const source = 'length = input.int(14)\nemit "sma" ta.sma(close, length)';
 * const program = compileToProgram(
 *   [{filename: 'sma.tea', source}],
 *   new Errors(),
 * );
 * if (program !== null) {
 *   const module = loadModule(generate(program));
 *   module.remaining(); // ['length']
 *   module.bind({length: 20}).parameters[0].value; // 20
 * }
 * ```
 */
export function loadModule(source: string): Module {
  const compiled = ts.transpileModule(source, {
    fileName: 'generated.ts',
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const errors = compiled.diagnostics?.filter(
    diagnostic => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors?.length) {
    throw new SyntaxError(
      errors
        .map(diagnostic =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        )
        .join('\n'),
    );
  }
  const module = {exports: {} as {default?: Module}};
  new Function('require', 'module', 'exports', compiled.outputText)(
    (specifier: string) => {
      if (specifier !== 'tea/runtime') {
        throw new Error(`generated module cannot import '${specifier}'`);
      }
      return runtime;
    },
    module,
    module.exports,
  );
  if (!(module.exports.default instanceof runtime.Module)) {
    throw new Error('generated module must export a runtime Module');
  }
  return module.exports.default;
}
