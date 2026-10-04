// Purpose: Compositional IR preserves observable evaluation, initialization, and history contracts.

import {Schema} from 'apache-arrow';
import {describe, expect, test} from 'vitest';
import {mustBuild} from '../noder/testing';
import {loadModule} from '../runtime/load';
import {executeTestProgram, finiteStream} from '../testing/batch';
import {OutputCapture} from '../testing/output';
import {checkGenerated} from './check';
import {generate} from './codegen';

async function execute(source: string, rows = 1): Promise<OutputCapture> {
  const sink = new OutputCapture();
  await executeTestProgram(mustBuild(source), {
    stream: finiteStream(
      new Schema([]),
      Array.from({length: rows}, () => ({})),
    ),
    sink,
    timeNow: 0,
  });
  return sink;
}

describe('compositional semantic IR', () => {
  test('a float range bound makes an int start count as a float index', async () => {
    const source = `
upTo = 0.0
for i = 0 to 2.5
    upTo += i
halves = 0.0
for j = 0 to 1 by 0.5
    halves += j
mixed = 0.0
for k = bar_index to 1.5
    mixed += k
emit "upTo" upTo
emit "halves" halves
emit "mixed" mixed
`;
    const sink = await execute(source);
    expect(sink.publications[0]).toMatchObject({
      upTo: 3,
      halves: 1.5,
      mixed: 1,
    });
    // `tea build` type-checks the same module.
    expect(() => checkGenerated(generate(mustBuild(source)))).not.toThrow();
  });

  test('statement expressions keep their effects without replacing a block result', async () => {
    const sink = await execute(`
struct Counter
    int value
    int next() =>
        this.value += 1
        this.value
sample(Counter counter) =>
    counter.next()
    if true
        counter.next()
    for i = 0 to 1
        counter.next()
    counter.value
    42
counter = Counter.new(0)
counter.next()
emit "result" sample(counter)
emit "calls" counter.value
`);
    expect(sink.publications[0]).toMatchObject({result: 42, calls: 5});
  });

  test('compound assignment captures the receiver once before RHS rebinding', async () => {
    const sink = await execute(`
struct Counter
    int value
struct Holder
    Counter target
    int calls
    Counter get() =>
        this.calls += 1
        this.target
    int replace() =>
        this.target := Counter.new(100)
        5
holder = Holder.new(Counter.new(1), 0)
original = holder.target
holder.get().value += holder.replace()
emit "original" original.value
emit "replacement" holder.target.value
emit "calls" holder.calls
`);
    expect(sink.publications[0]).toMatchObject({
      original: 6,
      replacement: 100,
      calls: 1,
    });
  });

  test('writable native calls capture the old header and return their separate result', async () => {
    const sink = await execute(`
struct Holder
    array<int> values
    int replace() =>
        this.values := array.from(99)
        7
holder = Holder.new(array.from(1))
original = holder.values
holder.values.push(holder.replace())
emit "updated" holder.values
last = holder.values.pop()
emit "last" last
emit "remaining" holder.values
emit "original" original
`);
    expect(sink.publications[0]).toMatchObject({
      updated: [1, 7],
      last: 7,
      remaining: [1],
      original: [1],
    });
  });

  test('return in a persistent initializer exits the function without initializing it', async () => {
    const sink = await execute(
      `
choose(skip) =>
    var value = if skip
        return 7
    else
        9
    return value + 1
emit "value" choose(bar_index % 2 == 0)
`,
      3,
    );
    expect(sink.publications.map(row => row.value)).toEqual([7, 10, 10]);
  });

  test('ternary evaluates only its selected arm and remains bindable as a history offset', async () => {
    const sink = await execute(`
struct Counter
    int value
    int next() =>
        this.value += 1
        this.value
counter = Counter.new(0)
value = true ? 3 : counter.next()
emit "value" value
emit "count" counter.value
`);
    expect(sink.publications[0]).toMatchObject({value: 3, count: 0});
    let module = loadModule(
      generate(
        mustBuild(`
fast = input.bool(true)
small = input.int(1)
large = input.int(3)
choose(x, y, flag) =>
    return flag ? x : y
emit "value" close[choose(small, large, fast)]
`),
      ),
    ).bind();
    expect(module.inputs.series[0].depth).toEqual({kind: 'const', bars: 1});
    module = module.bind({fast: false});
    expect(module.inputs.series[0].depth).toEqual({kind: 'const', bars: 3});
  });

  test('constant output IDs keep their current value and independent parameter history', async () => {
    const sink = await execute(
      `
publish(const string id) =>
    previous = (id)[1]
    alias = id
    priorAlias = alias[1]
    emit id previous
    emit (alias + ".alias") priorAlias
    return id
emit "current" publish("a")
`,
      3,
    );
    expect(sink.fields.map(field => field.name)).toEqual([
      'current',
      'a',
      'a.alias',
    ]);
    expect(sink.publications.map(row => row.a)).toEqual([null, 'a', 'a']);
    expect(sink.publications.map(row => row['a.alias'])).toEqual([
      null,
      'a',
      'a',
    ]);
    expect(sink.publications.map(row => row.current)).toEqual(['a', 'a', 'a']);
  });
});
