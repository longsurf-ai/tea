// Purpose: Run every reference example through `tea run`'s own code and keep the table of what each one writes, for the generated pages.

import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {TabWriter} from '../../src/base/tabwriter';
import {runCommand} from '../../src/cli/execution';
import type {DocExample} from '../../src/syntax/doc-comments';

/** The key an example's output is stored under: its program and its input. */
export function exampleKey(example: DocExample): string {
  return JSON.stringify([example.source, example.csv]);
}

/**
 * Run each example once, in order, as `tea run example.tea --input
 * example.csv --trace` runs it with the clock fixed at 0, and keep a table of
 * the columns its program writes: those whose name the program spells as a
 * string, so a strategy's broker event columns stay out. Without a CSV the
 * program runs on one bar whose `time` is 0.
 *
 * Fails, naming every such example, when a program is empty, reads
 * `timenow`, does not compile, stops with an error, or writes nothing, or
 * when its CSV does not start with `time`.
 *
 * @param examples Each example with the entry it documents, for errors.
 */
export async function runExamples(
  examples: Iterable<readonly [string, DocExample]>,
): Promise<Map<string, string>> {
  const outputs = new Map<string, string>();
  const failures: string[] = [];
  const directory = await mkdtemp(path.join(tmpdir(), 'tea-reference-'));
  try {
    for (const [where, example] of examples) {
      const key = exampleKey(example);
      if (outputs.has(key)) continue;
      try {
        outputs.set(key, await runExample(example, directory));
      } catch (error) {
        failures.push(`${where}: ${(error as Error).message}`);
      }
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
  if (failures.length > 0) {
    throw new Error(`Examples that do not run:\n${failures.join('\n')}`);
  }
  return outputs;
}

async function runExample(
  example: DocExample,
  directory: string,
): Promise<string> {
  if (example.source.trim() === '') throw new Error('it has no tea program');
  if (/\btimenow\b/.test(example.source)) {
    throw new Error('it reads timenow, which differs on every run');
  }
  const csv = example.csv ?? 'time\n0';
  if (!/^time(,|\n|$)/.test(csv)) {
    throw new Error('its CSV must start with a time column');
  }
  const file = path.join(directory, 'example.tea');
  const input = path.join(directory, 'example.csv');
  await writeFile(file, `${example.source}\n`, 'utf8');
  await writeFile(input, `${csv}\n`, 'utf8');
  const printed: string[] = [];
  const result = await runCommand(file, input, {trace: true}, [], {
    now: () => 0,
    print: line => printed.push(line),
  });
  if (!result.ok) {
    throw new Error(
      result.kind === 'diagnostics'
        ? result.errors
            .map(error => `${error.pos.line}: ${error.msg}`)
            .join('; ')
        : result.message,
    );
  }
  // `# set "name" type=float` declares a column; `3 "name" 1.5` is a cell.
  const columns = printed.flatMap(line => {
    const declared = /^# \w+ ("(?:[^"\\]|\\.)*") /.exec(line);
    return declared === null ? [] : [JSON.parse(declared[1]!) as string];
  });
  const shown = columns.filter(name =>
    example.source.includes(JSON.stringify(name)),
  );
  if (shown.length === 0) throw new Error('it writes no output');
  const rows = new Map<number, Map<string, string>>();
  for (const line of printed) {
    const cell = /^(\d+) ("(?:[^"\\]|\\.)*") (.*)$/.exec(line);
    if (cell === null) continue;
    const index = Number(cell[1]);
    const row = rows.get(index) ?? new Map<string, string>();
    row.set(JSON.parse(cell[2]!) as string, cell[3]!);
    rows.set(index, row);
  }
  const writer = new TabWriter();
  writer.writeCells(['index', ...shown]);
  for (const [index, row] of rows) {
    writer.writeCells([String(index), ...shown.map(name => row.get(name)!)]);
  }
  return writer.flush();
}
