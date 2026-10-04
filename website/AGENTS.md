# Tea offline documentation renderer

Docusaurus shell that builds the static site: the public one on GitHub Pages
at https://longsurf-ai.github.io/tea/ (`TEA_DOCS_URL` and `TEA_DOCS_BASE_URL`,
set by `.github/workflows/docs.yml`), and the version-matched one packaged for
`tea docs`, served from the root. Navigation comes from `../docs/docs.json`.
Content lives in `../docs`; this directory owns only offline configuration,
navigation, and presentation.

## Invariants

- The website must build from the standalone `tea-lang` package without any
  workspace-only dependency or path outside the package.
- `website/package.json` is only the CommonJS build-tool boundary Docusaurus
  needs beneath Tea's ESM package; all dependency versions remain owned by the
  parent package manifest.
- Offline Documentation and Reference remain separate navbar entries;
  `sidebars.ts` derives both sidebars from `../docs/docs.json` rather than
  restating them, and generated reference pages never enter the learning
  sequence.
- Broken links, Markdown links, and anchors fail the build.
- Styling stays reading-first, uses local system fonts, and loads no remote
  assets. The one exception to system fonts is KaTeX's math fonts, bundled
  from the `katex` package with its stylesheet for `$$` formulas.
- `.docusaurus/` and `build/` are generated outputs, never source files.
  `.gitignore` excludes both; `.npmignore` excludes only `.docusaurus/` so
  installed releases contain the prebuilt site.
