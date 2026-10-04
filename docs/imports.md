---
title: 'Imports: naming and loading Tea files'
sidebarTitle: Imports
---

A script imports a library that ships with Tea by its name, and one of its own
files by a relative path.
[`import`](reference/language/declarations.md#import-and-as) gives the syntax;
this page defines how an import finds and reads its file.

```text
import ta
import ./lib/bands
import ../shared/risk as limits

upper = bands.upper(close, 2.0)
emit "capped" limits.cap(upper, 100.0)
```

## Specifiers

A specifier that starts with `./` or `../` names a file relative to the file
that contains it. Any other specifier names a library.

| Written                         | Kind              | Resolves to                                               |
| ------------------------------- | ----------------- | --------------------------------------------------------- |
| `import ta`                     | bare, one segment | A library that ships with Tea.                            |
| `import someone/lib/1`          | bare, several     | Published library. Reported as `external`, not supported. |
| `import ./lib/bands`            | relative          | `lib/bands.tea` beside the importing file.                |
| `import ../shared/risk as risk` | relative          | `shared/risk.tea` one directory above the importing file. |

The kind is decided by spelling alone, so a file can never stand in for a
shipped library such as `ta`.

A relative path is its upward steps first and then names: `./name`,
`../../lib/name`. Each name is a Tea identifier, so a file such as `my-lib.tea`
cannot be imported. `./a/../b` and a trailing `/` are malformed.

Without `as`, the namespace is the name the imported file declares in
`library("...")`, not its path. The imported file must be a library; Tea
reports `has no library() declaration` otherwise.

`import` is a contextual keyword. Only `./` and `../` open a relative path:
`import.x` selects from a variable named `import`.

## Resolution

```text
canonical path = normalize( dirname(importing file) / specifier + ".tea" )
```

The canonical path identifies the library and is its filename in diagnostics.
Two files that reach one library through different spellings share one
library. A specifier inside a library resolves against that library, not
against the entry script.

One import names exactly one file: `.tea` is appended, and no other file or
directory is tried. A path may leave the importing script's directory through
as many `../` steps as it needs; Tea has no project root that limits it.

## Hosts

A host names its entry file by its real path; the compiler reads it and follows
imports on disk. `compileToProgram(inputs, errors, {includeSources: true})`
returns `{program, sources}`, capturing the exact entry and dependency texts
used by that compilation. Libraries that ship with Tea are not included.

For a stored snapshot, pass `{filename, source, imports}` as a `SourceInput`.
`imports` maps canonical filenames to their text. An explicit map (including an
empty one) supplies the complete set of imported files; missing files never fall
back to disk. Omitting `imports` retains ordinary filesystem resolution, including
for an editor's unsaved entry text. Libraries that ship with Tea never come
from `imports`.

| Host                        | Entry filename         | Relative imports resolve against |
| --------------------------- | ---------------------- | -------------------------------- |
| `tea run`, `build`, `parse` | The path as typed      | That file's directory.           |
| `tea lsp`                   | The `file:` URI's path | That file's directory.           |
| Embedding application       | The script's real path | That file's directory.           |
| `tea` template tag          | `<tea-template>`       | The process working directory.   |

An embedding application that passes `{filename, source}` sends the real path as
`filename`, even when `source` is newer than the file, as an editor's unsaved
text is.

## Errors

Resolution errors sit on the import statement, like those of shipped libraries.

```text
strategies/a.tea:1:8: cannot find './lib/bands' (no file strategies/lib/bands.tea)
a.tea:1:8: malformed import path './lib/'
a.tea:1:8: in library 'x/a.tea': in library 'x/b.tea': import cycle: x/a.tea -> x/b.tea -> x/a.tea
```

An error inside an imported file keeps its own position, for example
`lib/plain.tea:1:1: library 'lib/plain.tea' has no library() declaration`. The
language server shows it on the import that names that file, and shows an error
in an imported function's body on the call that reached it.

## Limitations

- `tea lsp` reads imported files from disk, so unsaved edits to an imported
  file reach the files that import it only when it is saved.
- A struct or enum exported from an imported file carries its canonical path in
  its `tea:typeId`. Hosts that name the entry differently, by a relative or an
  absolute path, therefore produce different ids for the same type.
