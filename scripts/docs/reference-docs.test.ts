// Purpose: Fail when any public Tea surface lacks reference documentation, and compile every Tea example the reference publishes.

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {CATALOG, type NativeVar} from '../../src/checker/catalog';
import {
  NATIVE_FUNCTION_DOCS,
  NATIVE_VALUE_DOCS,
} from '../../src/checker/catalog-docs';
import {PUBLIC_TYPE_CATALOG} from '../../src/checker/type-catalog';
import {generate} from '../../src/codegen/codegen';
import {Qualifier} from '../../src/ir/type';
import {buildText} from '../../src/noder/testing';
import {AssignOp, SOURCE_DECLARATION_KINDS} from '../../src/syntax/nodes';
import {KEYWORDS, Op} from '../../src/syntax/tokens';
import {referenceManual} from '../../src/reference/index';
import {referenceOutputs} from './generate-reference';
import {javascriptApi} from './javascript-api-docs';
import {type DocComment} from '../../src/syntax/doc-comments';
import {teaLibraries} from './tea-library-docs';

const LANGUAGE_PAGES = [
  'lexical-structure',
  'types',
  'declarations',
  'expressions',
  'control-flow',
  'outputs',
] as const;

function languagePage(name: (typeof LANGUAGE_PAGES)[number]): string {
  return readFileSync(
    fileURLToPath(
      new URL(`../../docs/reference/language/${name}.md`, import.meta.url),
    ),
    'utf8',
  );
}

function teaFences(markdown: string): string[] {
  return [...markdown.matchAll(/```tea\n([\s\S]*?)```/g)].map(
    match => match[1]!,
  );
}

function expectCompiles(source: string, name: string): void {
  const result = buildText(source, name);
  expect(
    result.errors.map(error => `${error.pos.line}: ${error.msg}`),
    `${name}:\n${source}`,
  ).toEqual([]);
  expect(generate(result.program!).length).toBeGreaterThan(0);
}

/** Every inline code span written in a heading line. */
function headingCode(markdown: string): Set<string> {
  const spans = new Set<string>();
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('#')) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) spans.add(match[1]!);
  }
  return spans;
}

function headings(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => line.replace(/^#+\s*/, '').replaceAll('`', ''));
}

/** A one-sentence summary reads as a sentence and fits one table row. */
function summaryProblem(summary: string): string | null {
  if (summary.trim() === '') return 'empty summary';
  if (!/[.!?]$/.test(summary.trim())) return 'summary must end with a period';
  if (summary.includes('\n')) return 'summary must be one line';
  return null;
}

// Literal-like names are language syntax, documented with the literals.
const isLiteral = (value: NativeVar) =>
  value.qualifier === Qualifier.Const && !value.name.includes('.');

function valueDocKeys(name: string): string[] {
  return Object.keys(NATIVE_VALUE_DOCS).filter(key =>
    key.endsWith('*') ? name.startsWith(key.slice(0, -1)) : key === name,
  );
}

describe('native catalog documentation', () => {
  test('documents every native function and every supported parameter', () => {
    expect(Object.keys(NATIVE_FUNCTION_DOCS).sort()).toEqual(
      [...CATALOG.funcs.keys()].sort(),
    );
    const problems: string[] = [];
    for (const [name, overloads] of CATALOG.funcs) {
      const doc = NATIVE_FUNCTION_DOCS[name]!;
      const supported = [
        ...new Set(
          overloads.flatMap(overload =>
            overload.params
              .filter(param => param.availability === 'supported')
              .map(param => param.name),
          ),
        ),
      ].sort();
      const documented = Object.keys(doc.params).sort();
      if (supported.join() !== documented.join()) {
        problems.push(
          `${name}: parameters ${supported.join(', ')} documented as ${documented.join(', ')}`,
        );
      }
      const summary = summaryProblem(doc.summary);
      if (summary !== null) problems.push(`${name}: ${summary}`);
    }
    expect(problems).toEqual([]);
  });

  test('documents every native value exactly once', () => {
    const problems: string[] = [];
    const values = [...CATALOG.vars.values()].filter(
      value => !isLiteral(value),
    );
    for (const value of values) {
      const keys = valueDocKeys(value.name);
      if (keys.length !== 1) {
        problems.push(`${value.name}: documented by ${keys.length} entries`);
      }
    }
    for (const [key, doc] of Object.entries(NATIVE_VALUE_DOCS)) {
      const covered = values.filter(value =>
        valueDocKeys(value.name).includes(key),
      );
      if (covered.length === 0)
        problems.push(`${key}: matches no native value`);
      for (const member of Object.keys(doc.members ?? {})) {
        if (!covered.some(value => value.name === member)) {
          problems.push(`${key}: member ${member} is not in this family`);
        }
      }
      const summary = summaryProblem(doc.summary);
      if (summary !== null) problems.push(`${key}: ${summary}`);
    }
    expect(problems).toEqual([]);
  });

  test('compiles every native example', () => {
    for (const [name, doc] of [
      ...Object.entries(NATIVE_FUNCTION_DOCS),
      ...Object.entries(NATIVE_VALUE_DOCS),
    ]) {
      const sources = [
        ...(doc.example === undefined ? [] : [doc.example]),
        ...teaFences(doc.details ?? ''),
      ];
      sources.forEach((source, index) =>
        expectCompiles(source, `native-${name}-${index}.tea`),
      );
    }
  });
});

function docProblems(
  where: string,
  doc: DocComment | null,
  params: readonly string[] | null,
): string[] {
  if (doc === null) return [`${where}: missing doc comment`];
  const problems: string[] = [];
  const summary = summaryProblem(doc.summary);
  if (summary !== null) problems.push(`${where}: ${summary}`);
  if (params !== null) {
    const documented = [...doc.params.keys()].sort().join();
    if (documented !== [...params].sort().join()) {
      problems.push(
        `${where}: parameters ${params.join(', ')} documented as ${[...doc.params.keys()].join(', ')}`,
      );
    }
  } else if (doc.params.size > 0) {
    problems.push(`${where}: @param on a declaration without parameters`);
  }
  return problems;
}

describe('shipped Tea library documentation', () => {
  for (const library of teaLibraries()) {
    test(`${library.name}: documents the library, every export and every member`, () => {
      const problems = docProblems(
        `${library.file} library()`,
        library.doc,
        null,
      );
      for (const item of library.exports) {
        const where = `${library.file}:${item.line} ${item.name}`;
        problems.push(
          ...docProblems(
            where,
            item.doc,
            item.kind === 'function'
              ? item.params.map(param => param.name)
              : null,
          ),
        );
        if (item.doc !== null && item.doc.category === null) {
          problems.push(`${where}: missing @category`);
        }
        for (const member of item.members) {
          problems.push(
            ...docProblems(
              `${library.file}:${member.line} ${item.name}.${member.name}`,
              member.doc,
              member.kind === 'method' ? member.params : null,
            ),
          );
        }
      }
      expect(problems).toEqual([]);
    });

    test(`${library.name}: writes docs as /** */ blocks with known tags`, () => {
      const source = readFileSync(
        fileURLToPath(new URL(`../../src/${library.file}`, import.meta.url)),
        'utf8',
      );
      const problems = source
        .split('\n')
        .flatMap((line, index) =>
          /^\s*\/\/\//.test(line)
            ? [
                `${library.file}:${index + 1}: use a /** */ doc comment, not ///`,
              ]
            : [],
        );
      for (const block of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
        for (const tag of block[0].matchAll(/^\s*\*?\s*@(\w+)/gm)) {
          if (!['param', 'returns', 'category'].includes(tag[1]!)) {
            problems.push(`${library.file}: unknown doc tag @${tag[1]}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    test(`${library.name}: compiles every example`, () => {
      const docs = [
        library.doc,
        ...library.exports.flatMap(item => [
          item.doc,
          ...item.members.map(member => member.doc),
        ]),
      ];
      docs.forEach((doc, index) =>
        teaFences(doc?.body ?? '').forEach((source, example) =>
          expectCompiles(source, `${library.name}-${index}-${example}.tea`),
        ),
      );
    });
  }
});

describe('language reference pages', () => {
  test('cover every keyword, operator, literal name and comment form in a heading', () => {
    const covered = new Set(
      LANGUAGE_PAGES.flatMap(page => [...headingCode(languagePage(page))]),
    );
    const required = [
      ...KEYWORDS,
      ...Object.values(Op),
      '=',
      ...Object.values(AssignOp),
      '?:',
      '[]',
      '.',
      '=>',
      'true',
      'false',
      'na',
      '//',
      '/* */',
      '/** */',
      '//@version',
    ];
    expect(required.filter(token => !covered.has(token))).toEqual([]);
  });

  test('cover every public type and qualifier', () => {
    const covered = headingCode(languagePage('types'));
    const required = [
      ...PUBLIC_TYPE_CATALOG.map(type => type.name),
      Qualifier.Const,
      Qualifier.Input,
      Qualifier.Simple,
      Qualifier.Series,
    ];
    expect(required.filter(name => !covered.has(name))).toEqual([]);
  });

  test('cover every source declaration form', () => {
    // Typed over the declaration kinds, so a new kind does not compile until
    // it names the heading that documents it.
    const documentedBy: Record<
      (typeof SOURCE_DECLARATION_KINDS)[number],
      string
    > = {
      DeclStmt: 'Variables',
      FuncDecl: 'Functions',
      MethodDecl: 'Methods',
      InterfaceDecl: 'interface',
      InterfaceMethodDecl: 'interface',
      Param: 'Parameters',
      TypeParam: 'Type parameters',
      StructDecl: 'struct',
      TypeAliasDecl: 'type',
      FieldDecl: 'Fields',
      EnumDecl: 'enum',
      EnumMember: 'enum',
      ImportStmt: 'import',
    };
    const titles = headings(languagePage('declarations'));
    const missing = SOURCE_DECLARATION_KINDS.filter(
      kind =>
        !titles.some(title =>
          title.split(/\s+/).join(' ').includes(documentedBy[kind]),
        ),
    );
    expect(missing).toEqual([]);
  });

  test('compile every Tea example', () => {
    for (const page of LANGUAGE_PAGES) {
      teaFences(languagePage(page)).forEach((source, index) =>
        expectCompiles(source, `language-${page}-${index}.tea`),
      );
    }
  });
});

describe('JavaScript API documentation', () => {
  const api = javascriptApi();
  for (const entry of api) {
    test(`${entry.specifier}: documents the entry point and every export`, () => {
      const problems: string[] = [];
      if (entry.description === null) {
        problems.push(`${entry.source}: missing @packageDocumentation comment`);
      }
      for (const item of entry.exports) {
        if (item.doc.text === '')
          problems.push(`${entry.specifier}: ${item.name} has no TSDoc`);
      }
      expect(problems).toEqual([]);
    });
  }
});

describe('reference generation', () => {
  // Generation fails on a `{@link}` that names no documented symbol, a page
  // missing from docs.json, or a docs.json page that does not exist.
  test('renders every page the Reference navigation lists', async () => {
    const outputs = await referenceOutputs();
    expect(outputs.size).toBeGreaterThan(0);
  });
});

describe('in-app reference manual', () => {
  test('holds the script-facing pages with unique entries and links that resolve', () => {
    expect(referenceManual.groups.map(group => group.title)).toEqual([
      'Language',
      'Built-ins',
      'Libraries',
    ]);
    const pages = referenceManual.groups.flatMap(group => group.pages);
    const entries = pages.flatMap(page =>
      page.kind === 'entries' ? page.entries.map(entry => entry.id) : [],
    );
    expect(new Set(entries).size).toBe(entries.length);
    expect(entries).toEqual(
      expect.arrayContaining([
        'ta.sma',
        'plot',
        'close',
        'color.*',
        'trade.nextOpen',
      ]),
    );
    // `#ta.sma` names an entry, `#reference/builtins/ta` a page.
    const targets = new Set([...entries, ...pages.map(page => page.id)]);
    const links = [
      ...JSON.stringify(referenceManual).matchAll(/\]\(#([^)]+)\)/g),
    ].map(match => match[1]!);
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter(link => !targets.has(link))).toEqual([]);
    // `tea/referenceName` answers `color.red`, a symbol of `color.*`.
    const color = pages
      .flatMap(page => (page.kind === 'entries' ? page.entries : []))
      .find(entry => entry.id === 'color.*');
    expect(color?.symbols).toContain('color.red');
  });
});
