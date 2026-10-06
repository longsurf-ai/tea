// Purpose: Compile the Tea examples in the published guide pages.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {expect, test} from 'vitest';
import {buildText} from '../../src/noder/testing';
import {generate} from '../../src/codegen/codegen';

const pages = [
  'getting-started/Hello world.md',
  'getting-started/Write your first indicator.md',
  'advanced/tea-compiler.md',
  'geometry.md',
  'runtime.md',
  'language-guide/program-structure.md',
  'language-guide/execution-model.md',
  'language-guide/values-and-control-flow.md',
  'language-guide/time-series.md',
  'language-guide/outputs-and-events.md',
  'requests.md',
];
for (const page of pages) {
  test(`authoring examples compile: ${page}`, () => {
    const markdown = readFileSync(
      fileURLToPath(new URL(`../../docs/${page}`, import.meta.url)),
      'utf8',
    );
    const examples = [...markdown.matchAll(/```tea\n([\s\S]*?)```/g)];
    expect(examples.length).toBeGreaterThan(0);
    for (const [index, example] of examples.entries()) {
      const result = buildText(example[1]!, `${page}-${index}.tea`);
      expect(result.errors.map(error => error.msg)).toEqual([]);
      expect(result.program).not.toBeNull();
      expect(generate(result.program!).length).toBeGreaterThan(0);
    }
  });
}
