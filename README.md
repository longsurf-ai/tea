# Tea language

Tea is a programming language for time-series analysis and trading. It compiles
to typed TypeScript using `tea/runtime`, with a supported scalar subset also
lowering to WGSL. Broker, portfolio, and visualization behavior lives in ordinary
Tea libraries.

Every entry is an ordinary program. For example:

```tea
// example.tea
sum = close + open
emit "sum" sum
plot("sum-plot", sum, "Open plus close")
```

With `dataset.csv`:

```csv
open,close
1.0,1.3
1.2,1.5
1.4,1.2
```

Run `tea run example.tea -i dataset.csv`. The named `sum` column contains
2.3, 2.7, and 2.6; `sum-plot` contains the corresponding visual descriptions.

Plain `emit` writes a column once per step. `emit.append` collects an ordered
list of values per step. Column names and types are fixed at compilation.
Functions support explicit `return` and implicit tail-expression returns;
ternaries evaluate only their selected branch.

## Embedding

Run `npm run build:package` to emit JavaScript and declarations. `tea` exports
Node/DataStream APIs and the Pine builtin supplier; `tea/runtime` exports the
typed execution library. Compiler hosts use `tea/compiler`, which takes source
through `compileToProgram`, `generate` and `loadModule` to a `Module`. Editors
use `tea/lsp` and `tea/reference`. The GPU backend is not exported yet.

All entries share one split build, preserving runtime class identity. Consumers
typecheck against declarations using their own compiler settings.

## Editor support

The VS Code/Cursor extension under [editors/vscode](editors/vscode) provides
syntax highlighting, comment commands, bracket pairing, and indentation-aware
folding for `.tea` files. See its README for packaging and installation.

## Documentation

Language documentation and Mintlify configuration live in [docs](docs).
Use a supported LTS Node release (20, 22, or 24), then run `npm run docs:dev`
while writing or `npm run docs:check` to validate references, navigation, and
the packaged offline build. The documentation is published at
https://longsurf-ai.github.io/tea/ from `main`.

The Reference under `docs/reference` is generated from the code it describes:
document a library export with a `/** */` doc comment directly above it, a native
function or value in `src/checker/catalog-docs.ts`, and a package export with
TSDoc; the `tea` command page comes from its command definitions. Only the
language pages in `docs/reference/language` are written by hand. Run
`npm run docs:generate` after changing any of these; `npm test` fails when a
public name is undocumented or an example does not compile.

The Docusaurus shell in [website](website) renders that site and the
version-matched offline build. `tea docs` serves the packaged build locally
without running a site builder or requiring network access.

See [Program IR](docs/ir.md), [Memory model](docs/memory-model.md), and
[Runtime](docs/runtime.md) for compiler and execution contracts.
