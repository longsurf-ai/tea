// Purpose: Read the published JavaScript API — every package.json export — with its TSDoc, from the same declarations the package ships.

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export type ApiKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'constant';

export interface ApiDoc {
  readonly text: string;
  readonly params: ReadonlyMap<string, string>;
  readonly returns: string | null;
  readonly examples: readonly string[];
}

export interface ApiMember {
  readonly name: string;
  readonly signature: string;
  readonly doc: ApiDoc;
}

export interface ApiExport {
  readonly name: string;
  readonly kind: ApiKind;
  /** A class exported with `export type`: no value exists at run time. */
  readonly typeOnly: boolean;
  readonly signature: string;
  readonly doc: ApiDoc;
  readonly members: readonly ApiMember[];
}

export interface ApiEntryPoint {
  /** The import specifier: `tea`, `tea/compiler`, … */
  readonly specifier: string;
  readonly source: string;
  /** The entry file's `@packageDocumentation` comment, if any. */
  readonly description: string | null;
  readonly exports: readonly ApiExport[];
}

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

interface PackageJson {
  readonly exports: Readonly<Record<string, {readonly types: string}>>;
}

/** package.json `exports`, in order, mapped from declaration file to source. */
function entryPoints(): readonly {specifier: string; source: string}[] {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  ) as PackageJson;
  return Object.entries(pkg.exports).map(([key, value]) => ({
    specifier: key === '.' ? 'tea' : `tea/${key.slice(2)}`,
    source: value.types
      .replace(/^\.\/dist\/types\//, 'src/')
      .replace(/\.d\.ts$/, '.ts'),
  }));
}

function tagText(tag: ts.JSDocTagInfo): string {
  return ts.displayPartsToString(tag.text).trim();
}

function apiDoc(symbol: ts.Symbol, checker: ts.TypeChecker): ApiDoc {
  const params = new Map<string, string>();
  let returns: string | null = null;
  const examples: string[] = [];
  for (const tag of symbol.getJsDocTags(checker)) {
    const text = tagText(tag);
    if (tag.name === 'param') {
      const match = /^(\S+)\s*(?:-\s*)?([\s\S]*)$/.exec(text);
      if (match !== null) params.set(match[1]!, match[2]!.trim());
    } else if (tag.name === 'returns') {
      returns = text;
    } else if (tag.name === 'example') {
      examples.push(text);
    }
  }
  return {
    text: ts
      .displayPartsToString(symbol.getDocumentationComment(checker))
      .trim(),
    params,
    returns,
    examples,
  };
}

function kindOf(declaration: ts.Declaration): ApiKind {
  if (ts.isFunctionDeclaration(declaration)) return 'function';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (ts.isInterfaceDeclaration(declaration)) return 'interface';
  if (ts.isTypeAliasDeclaration(declaration)) return 'type';
  if (ts.isEnumDeclaration(declaration)) return 'enum';
  return 'constant';
}

const printer = ts.createPrinter({removeComments: true});

function printed(node: ts.Node, file: ts.SourceFile): string {
  return printer
    .printNode(ts.EmitHint.Unspecified, node, file)
    .replace(/^export (declare )?/gm, '')
    .replace(/^declare /gm, '');
}

function isHidden(member: ts.ClassElement | ts.TypeElement): boolean {
  const flags = ts.getCombinedModifierFlags(member);
  return (
    (flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !== 0 ||
    (member.name !== undefined && ts.isPrivateIdentifier(member.name))
  );
}

/**
 * Emit declarations in memory, as `build:package` does on disk, so every
 * signature reads exactly as consumers see it: inferred types written out,
 * bodies and private implementation removed.
 */
function declarationProgram(sources: readonly string[]): ts.Program {
  const config = ts.getParsedCommandLineOfConfigFile(
    path.join(ROOT, 'tsconfig.json'),
    {},
    {...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {}},
  )!;
  const outDir = path.join(ROOT, '.reference-declarations');
  const options: ts.CompilerOptions = {
    ...config.options,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap: false,
    rootDir: path.join(ROOT, 'src'),
    outDir,
  };
  const program = ts.createProgram(
    sources.map(source => path.join(ROOT, source)),
    options,
  );
  const files = new Map<string, string>();
  program.emit(
    undefined,
    (name, text) => files.set(name, text),
    undefined,
    true,
  );
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError) => {
    const text = files.get(name);
    return text === undefined
      ? getSourceFile(name, languageVersion, onError)
      : ts.createSourceFile(name, text, languageVersion, true);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = name => files.has(name) || fileExists(name);
  const readFile = host.readFile.bind(host);
  host.readFile = name => files.get(name) ?? readFile(name);
  // `./recipe/batch` resolves through its in-memory directory's index file.
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = name =>
    name === outDir ||
    name.startsWith(`${outDir}${path.sep}`) ||
    (directoryExists?.(name) ?? false);
  return ts.createProgram(
    sources.map(source =>
      path.join(outDir, source.replace(/^src\//, '').replace(/\.ts$/, '.d.ts')),
    ),
    {...options, noEmit: true},
    host,
  );
}

function packageDescription(source: string): string | null {
  const text = readFileSync(path.join(ROOT, source), 'utf8');
  const match =
    /\/\*\*((?:(?!\*\/)[\s\S])*@packageDocumentation(?:(?!\*\/)[\s\S])*)\*\//.exec(
      text,
    );
  if (match === null) return null;
  return match[1]!
    .split('\n')
    .map(line => line.replace(/^\s*\* ?/, ''))
    .join('\n')
    .replace('@packageDocumentation', '')
    .trim();
}

/** Every package entry point and its exports, in package.json order. */
export function javascriptApi(): readonly ApiEntryPoint[] {
  const entries = entryPoints();
  const program = declarationProgram(entries.map(entry => entry.source));
  const checker = program.getTypeChecker();
  const outDir = program.getCompilerOptions().outDir!;
  return entries.map(entry => {
    const file = program.getSourceFile(
      path.join(
        outDir,
        entry.source.replace(/^src\//, '').replace(/\.ts$/, '.d.ts'),
      ),
    )!;
    const moduleSymbol = checker.getSymbolAtLocation(file)!;
    const exports = checker.getExportsOfModule(moduleSymbol).map(symbol => {
      const target =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      const declarations = target.declarations ?? [];
      const typeOnly = (symbol.declarations ?? []).some(
        declaration =>
          ts.isExportSpecifier(declaration) &&
          (declaration.isTypeOnly || declaration.parent.parent.isTypeOnly),
      );
      const signature = declarations
        .map(declaration => {
          const node = ts.isVariableDeclaration(declaration)
            ? declaration.parent.parent
            : ts.isClassDeclaration(declaration)
              ? ts.factory.updateClassDeclaration(
                  declaration,
                  declaration.modifiers,
                  declaration.name,
                  declaration.typeParameters,
                  declaration.heritageClauses,
                  declaration.members.filter(
                    member =>
                      !isHidden(member) &&
                      !(typeOnly && ts.isConstructorDeclaration(member)),
                  ),
                )
              : declaration;
          return printed(node, declaration.getSourceFile());
        })
        .join('\n');
      const members: ApiMember[] = [];
      for (const declaration of declarations) {
        if (
          !ts.isClassDeclaration(declaration) &&
          !ts.isInterfaceDeclaration(declaration)
        ) {
          continue;
        }
        for (const member of declaration.members) {
          if (isHidden(member)) continue;
          const memberSymbol =
            member.name === undefined
              ? undefined
              : checker.getSymbolAtLocation(member.name);
          if (memberSymbol === undefined) continue;
          const doc = apiDoc(memberSymbol, checker);
          if (doc.text === '') continue;
          if (members.some(existing => existing.name === memberSymbol.name)) {
            continue;
          }
          members.push({
            name: memberSymbol.name,
            signature: printed(member, declaration.getSourceFile()),
            doc,
          });
        }
      }
      const kind = kindOf(declarations[0]!);
      return {
        name: symbol.name,
        // A class exported as a type only cannot be constructed or tested.
        kind: typeOnly && kind === 'class' ? 'type' : kind,
        typeOnly: typeOnly && kind === 'class',
        signature,
        // A re-export documented where it is re-exported (apache-arrow's
        // schema types in tea/runtime) carries its own doc.
        doc:
          symbol === target || apiDoc(symbol, checker).text === ''
            ? apiDoc(target, checker)
            : apiDoc(symbol, checker),
        members,
      };
    });
    return {
      specifier: entry.specifier,
      source: entry.source,
      description: packageDescription(entry.source),
      exports,
    };
  });
}
