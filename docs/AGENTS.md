# Tea documentation

Human-authored language documentation and generated reference material for the
standalone Tea toolchain. This directory is also the Mintlify project root;
`docs.json` owns the hosted reader experience and navigation. The Docusaurus
configuration in `../website/` exists only for the packaged offline renderer.

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
  TSDoc on package exports, and the CLI command tree. Only
  `reference/language/` is hand-written, because syntax has no declaration to
  carry it; tests keep it complete against the compiler's keywords,
  operators, types and declaration forms. Missing docs and examples that do
  not compile fail `npm test`. The same model also emits
  `src/reference/manual.json`, the script-facing pages as data for hosts
  (`tea/reference`). Generated files are never edited by hand.
- `docs.json` owns navigation for both renderers: `../website/sidebars.ts`
  derives the offline sidebars from it, and generation fails when its
  Reference tab and the generated pages disagree. Directory nesting does not
  create additional public sections implicitly.
- All links, examples, and assets must remain inside the independently
  extractable `tea-lang` package.
