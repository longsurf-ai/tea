// Purpose: The documentation an editor shows for a name — the doc comment above its declaration, or the catalog's docs for a native — as Markdown for hover, completion and signature help.

import {NATIVE_FUNCTION_DOCS, NATIVE_VALUE_DOCS} from '../checker/catalog-docs';
// `Object` is the checker's semantic object. A type-only import leaves the
// global `Object` value in place.
import {ObjectKind, type Object} from '../checker/object';
import type {Pos} from '../base/pos';
import {docCommentAbove, type DocComment} from '../syntax/doc-comments';
import {NodeKind, type Name} from '../syntax/nodes';
import type {Analysis} from './analysis';

/**
 * The doc comment of a declared object, or null. A function, type, enum,
 * interface, field, method or enum member reads the doc comment directly
 * above its declaration, in this document or in the library that declares
 * it; a library name reads the one above its `library(...)` header; a
 * top-level variable of this document reads the block above its declaration.
 * A catalog value such as `bar_index` or `color.red` has its catalog docs.
 *
 * Parameters, locals and type parameters have none: their declaration line
 * is their function's or type's, whose doc is not theirs.
 *
 * @example
 * ```ts
 * // For the `ema` of `ta.ema(close, 9)`:
 * objectDocs(analysis, object)?.summary; // 'Exponential moving average of `source`.'
 * ```
 */
export function objectDocs(
  analysis: Analysis,
  object: Object,
): DocComment | null {
  switch (object.kind) {
    case ObjectKind.Function:
      return docAbove(analysis, object.decl.pos);
    case ObjectKind.PackageName: {
      const header = object.pkg.files[0]?.stmtList.find(
        stmt =>
          stmt.kind === NodeKind.ExprStmt &&
          stmt.x.kind === NodeKind.CallExpr &&
          stmt.x.fun.kind === NodeKind.Name &&
          stmt.x.fun.value === 'library',
      );
      return header === undefined ? null : docAbove(analysis, header.pos);
    }
    case ObjectKind.Builtin:
      // A series binding is a library's input alias, `close`; anything else
      // is the catalog's.
      return object.binding?.kind === 'series'
        ? docAbove(analysis, definedAt(analysis, object)?.pos)
        : nativeValueDocs(object.name);
    case ObjectKind.Variable: {
      const name = definedAt(analysis, object);
      const topLevel =
        object.packageGlobal !== null ||
        analysis.file.stmtList.some(
          stmt =>
            stmt.kind === NodeKind.DeclStmt &&
            stmt.target.kind === NodeKind.Name &&
            stmt.target === name,
        );
      return topLevel ? docAbove(analysis, name?.pos) : null;
    }
    case ObjectKind.TypeParameter:
      return null;
    default:
      return docAbove(analysis, definedAt(analysis, object)?.pos);
  }
}

/** The catalog docs of a native function such as `math.round`, or null. */
export function nativeFunctionDocs(name: string): DocComment | null {
  const doc = NATIVE_FUNCTION_DOCS[name];
  if (doc === undefined) return null;
  return {
    summary: doc.summary,
    body: blocks(doc.details, fenced(doc.example)),
    params: new Map(Object.entries(doc.params)),
    returns: doc.returns ?? null,
    category: doc.category,
  };
}

/**
 * The catalog docs of a native value such as `bar_index`, or of the family a
 * constant such as `color.red` belongs to, with that constant's own note
 * first. Null for a name the catalog does not document.
 */
export function nativeValueDocs(name: string): DocComment | null {
  const key = Object.keys(NATIVE_VALUE_DOCS).find(candidate =>
    candidate.endsWith('*')
      ? name.startsWith(candidate.slice(0, -1))
      : candidate === name,
  );
  if (key === undefined) return null;
  const doc = NATIVE_VALUE_DOCS[key]!;
  return {
    summary: doc.summary,
    body: blocks(doc.members?.[name], doc.details, fenced(doc.example)),
    params: new Map(),
    returns: null,
    category: doc.category,
  };
}

/**
 * A doc comment as hover Markdown: the summary, the body, then the
 * parameters and the result.
 *
 * @example
 * ```ts
 * docMarkdown(nativeFunctionDocs('nz')!);
 * // 'Replaces a missing value with a fallback.\n\n...**Parameters**\n- `source` — ...'
 * ```
 */
export function docMarkdown(doc: DocComment): string {
  return blocks(
    editorText(doc.summary),
    editorText(doc.body),
    doc.params.size === 0
      ? undefined
      : `**Parameters**\n${[...doc.params]
          .map(([name, text]) => `- \`${name}\` — ${editorText(text)}`)
          .join('\n')}`,
    doc.returns === null ? undefined : `**Returns** ${editorText(doc.returns)}`,
  );
}

/**
 * Doc prose as an editor shows it. `{@link name}` becomes code, since an
 * editor has no page to link to, and a link to a documentation page keeps
 * only its label; a link with a scheme stays.
 */
export function editorText(text: string): string {
  return text
    .replace(
      /\{@link\s+([^\s}|]+)(?:\s*\|\s*([^}]+?))?\s*\}/g,
      (_, target: string, label: string | undefined) =>
        `\`${(label ?? target).trim()}\``,
    )
    .replace(/\[([^\]]+)\]\((?![a-z][a-z0-9+.-]*:)[^)]*\)/gi, '$1');
}

/**
 * A signature with one parameter per line once it is longer than `width`, so
 * `plot(const string id, series float series, ...)` reads as a list instead of
 * wrapping mid-type. A short or already multi-line signature is unchanged;
 * commas inside `<>`, `()` or `[]` stay with their parameter.
 *
 * @example
 * ```ts
 * wrapSignature('f(int a, int b) → int', 10);
 * // 'f(\n    int a,\n    int b\n) → int'
 * ```
 */
export function wrapSignature(signature: string, width = 64): string {
  const open = signature.indexOf('(');
  if (signature.length <= width || signature.includes('\n') || open < 0) {
    return signature;
  }
  const params: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let index = start; index < signature.length; index++) {
    const character = signature[index]!;
    if (character === ')' && depth === 0) {
      params.push(signature.slice(start, index).trim());
      return params[0] === ''
        ? signature
        : `${signature.slice(0, open)}(\n${params.map(param => `    ${param}`).join(',\n')}\n${signature.slice(index)}`;
    }
    if ('(<['.includes(character)) depth += 1;
    else if (')>]'.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      params.push(signature.slice(start, index).trim());
      start = index + 1;
    }
  }
  return signature;
}

function definedAt(analysis: Analysis, object: Object): Name | undefined {
  return analysis.definitions.get(object)?.[0];
}

function docAbove(analysis: Analysis, pos: Pos | undefined): DocComment | null {
  const lines = pos && analysis.lines.get(pos.base.filename);
  return lines ? docCommentAbove(lines, pos.line) : null;
}

function fenced(source: string | undefined): string | undefined {
  return source === undefined ? undefined : `\`\`\`tea\n${source}\n\`\`\``;
}

function blocks(...parts: readonly (string | undefined)[]): string {
  return parts.filter(part => part !== undefined && part !== '').join('\n\n');
}
