// Purpose: Read every compiler-shipped Tea library, its exported declarations, and their `/** */` doc comments.

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {newFileBase, type Pos} from '../../src/base/pos';
import {
  BUILTIN_FILES,
  DEFAULT_IMPLICIT,
  DEFAULT_PRELUDE,
} from '../../src/loader/loader';
import {
  NodeKind,
  type AnyNode,
  type Param,
  type Stmt,
} from '../../src/syntax/nodes';
import {docCommentAbove, type DocComment} from '../../src/syntax/doc-comments';
import {endPos} from '../../src/syntax/positions';
import {parse} from '../../src/syntax/syntax';

export interface LibraryParam {
  readonly name: string;
  readonly type: string | null;
  readonly defaultValue: string | null;
}

export interface LibraryMember {
  readonly kind: 'field' | 'method' | 'enum member';
  readonly name: string;
  readonly declaration: string;
  readonly params: readonly LibraryParam[];
  readonly doc: DocComment | null;
  readonly line: number;
}

export interface LibraryExport {
  readonly kind: 'function' | 'type' | 'enum' | 'interface' | 'value';
  readonly name: string;
  readonly declaration: string;
  readonly params: readonly LibraryParam[];
  readonly members: readonly LibraryMember[];
  readonly doc: DocComment | null;
  readonly line: number;
}

/** How a script reaches a library's exports, decided by the loader. */
export type LibraryAccess = 'namespace' | 'global' | 'import';

export interface TeaLibrary {
  readonly name: string;
  readonly file: string;
  readonly access: LibraryAccess;
  readonly doc: DocComment | null;
  readonly exports: readonly LibraryExport[];
}

const LIBRARY_ROOT = fileURLToPath(
  new URL('../../src/tea-lib/', import.meta.url),
);

function sourceSlicer(source: string): (from: Pos, to: Pos) => string {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  const offset = (pos: Pos) => starts[pos.line - 1]! + pos.col - 1;
  return (from, to) => source.slice(offset(from), offset(to));
}

function readLibrary(name: string, filename: string): TeaLibrary {
  const file = `tea-lib/${filename}`;
  const source = readFileSync(`${LIBRARY_ROOT}${filename}`, 'utf8');
  const ast = parse(newFileBase(file), source, (pos, message) => {
    throw new Error(`${file}:${pos.line}: ${message}`);
  });
  const lines = source.split('\n');
  const slice = sourceSlicer(source);
  const text = (node: AnyNode) => slice(node.pos, endPos(node)).trim();
  const param = (p: Param): LibraryParam => ({
    name: p.name.value,
    type: p.paramType === null ? null : slice(p.pos, p.name.pos).trim(),
    defaultValue: p.defaultValue === null ? null : text(p.defaultValue),
  });
  // A declaration line starts with `export `; signatures read without it.
  const unexported = (value: string) => value.replace(/^export\s+/, '');

  let doc: DocComment | null = null;
  const exports: LibraryExport[] = [];
  for (const stmt of ast.stmtList as readonly Stmt[]) {
    if (
      stmt.kind === NodeKind.ExprStmt &&
      stmt.x.kind === NodeKind.CallExpr &&
      stmt.x.fun.kind === NodeKind.Name &&
      stmt.x.fun.value === 'library'
    ) {
      doc = docCommentAbove(lines, stmt.pos.line);
      continue;
    }
    if (!('exported' in stmt) || !stmt.exported) continue;
    const common = {
      doc: docCommentAbove(lines, stmt.pos.line),
      line: stmt.pos.line,
    };
    switch (stmt.kind) {
      case NodeKind.FuncDecl:
        exports.push({
          ...common,
          kind: 'function',
          name: stmt.name.value,
          declaration: stmt.name.value,
          params: stmt.params.map(param),
          members: [],
        });
        break;
      case NodeKind.StructDecl:
        exports.push({
          ...common,
          kind: 'type',
          name: stmt.name.value,
          declaration: unexported(lines[stmt.pos.line - 1]!.trim()),
          params: [],
          members: stmt.members.map(member => ({
            kind: member.kind === NodeKind.MethodDecl ? 'method' : 'field',
            name: member.name.value,
            declaration:
              member.kind === NodeKind.MethodDecl
                ? slice(member.pos, member.body.pos)
                    .trim()
                    .replace(/\s*=>$/, '')
                : text(member),
            params:
              member.kind === NodeKind.MethodDecl
                ? member.params.map(param)
                : [],
            doc: docCommentAbove(lines, member.pos.line),
            line: member.pos.line,
          })),
        });
        break;
      case NodeKind.InterfaceDecl:
        exports.push({
          ...common,
          kind: 'interface',
          name: stmt.name.value,
          declaration: unexported(lines[stmt.pos.line - 1]!.trim()),
          params: [],
          members: stmt.methods.map(method => ({
            kind: 'method',
            name: method.name.value,
            // endPos stops before an unstored `)` and receiver mode; an
            // interface method is always one source line.
            declaration: lines[method.pos.line - 1]!.trim(),
            params: method.params.map(param),
            doc: docCommentAbove(lines, method.pos.line),
            line: method.pos.line,
          })),
        });
        break;
      case NodeKind.EnumDecl:
        exports.push({
          ...common,
          kind: 'enum',
          name: stmt.name.value,
          declaration: unexported(lines[stmt.pos.line - 1]!.trim()),
          params: [],
          members: stmt.members.map(member => ({
            kind: 'enum member',
            name: member.name.value,
            declaration: text(member),
            params: [],
            doc: docCommentAbove(lines, member.pos.line),
            line: member.pos.line,
          })),
        });
        break;
      case NodeKind.DeclStmt: {
        const targets =
          stmt.target.kind === NodeKind.Name
            ? [stmt.target]
            : stmt.target.elems;
        for (const target of targets) {
          exports.push({
            ...common,
            kind: 'value',
            name: target.value,
            declaration: unexported(text(stmt)),
            params: [],
            members: [],
          });
        }
        break;
      }
      default:
        throw new Error(
          `${file}:${stmt.pos.line}: unexpected export ${stmt.kind}`,
        );
    }
  }
  const access: LibraryAccess = DEFAULT_PRELUDE.includes(name)
    ? 'global'
    : DEFAULT_IMPLICIT.includes(name)
      ? 'namespace'
      : 'import';
  return {name, file, access, doc, exports};
}

/** Every compiler-shipped library, in the loader's registry order. */
export function teaLibraries(): readonly TeaLibrary[] {
  return [...BUILTIN_FILES].map(([name, filename]) =>
    readLibrary(name, filename),
  );
}

/** How a script spells an export: `plot`, `ta.sma`, `trade.nextOpen`. */
export function qualifiedName(library: TeaLibrary, name: string): string {
  return library.access === 'global' ? name : `${library.name}.${name}`;
}
