# Tea documentation

Human-authored language documentation and generated reference material for the
standalone Tea toolchain. This directory is also the Mintlify project root,
used for previews and link checks; `docs.json` owns navigation. The Docusaurus
configuration in `../website/` renders the public site on GitHub Pages and the
packaged offline build.

## Invariants

- Introduction, Getting Started, Language Guide, and Advanced pages are
  human-authored and must never be overwritten by reference generation.
- `memory-model.md` remains the authority for source-observable value semantics,
  `ir.md` remains the authority for Program IR, and `runtime.md` remains the
  authority for physical execution and publication.
- `requests.md` is the sole detailed authority for public Node request-stream
  binding and synchronization: direct declaration names, clock/time units,
  policy precedence and windows, FIFO lifecycle, and the separation from
  Pine Batch sample merge. `ir.md` and `runtime.md` summarize and link to it
  rather than restating those policies independently.
- The Reference is generated from the code that owns each surface:
  `/** */` doc comments in `src/tea-lib` (parsed by
  `src/syntax/doc-comments.ts`), `src/checker/catalog-docs.ts` for natives,
  TSDoc on package exports, and the CLI command tree. Hand-written Reference
  pages are `reference/language/`, `imports`, `memory-model` and `requests`,
  because syntax and semantics have no declaration to carry them; tests keep
  the Language pages complete against the compiler's keywords, operators,
  types and declaration forms. Generation runs every `@example` program with
  `tea run`'s own code and writes what it emits under it, so a behavior change
  shows up as a stale page in `docs:check:generated`; those outputs are
  illustrations, never conformance references. Math appears only in
  `@formula`, as one `$$` block. The same model also emits
  `src/reference/manual.json`, the script-facing pages as data for hosts
  (`tea/reference`). Generated files are committed and never edited by hand;
  `npm run docs:generate` refreshes them.
- `docs.json` owns navigation for both renderers: `../website/sidebars.ts`
  derives the offline sidebars from it, and generation fails when its
  Reference tab and the generated pages disagree, printing the `pages` a
  per-entry group needs. `ta`, `trade`, `broker` and `portfolio` give each
  export its own page under the namespace page, grouped by its `@category`,
  so a category name is a sidebar label. Directory nesting does not create
  additional public sections implicitly.
- All links, examples, and assets must remain inside the independently
  extractable `tea-lang` package.
