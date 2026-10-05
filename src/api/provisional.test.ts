// Purpose: Exercise public Node attempts, commit order and child-window ownership.
import {Bool, Field, Float64, Schema, TimestampMillisecond} from 'apache-arrow';
import {of, Subject} from 'rxjs';
import {expect, test} from 'vitest';
import {DataStream} from './stream';
import {tea} from './tea';
import type {Datum, Node} from './node';
import {m, type Clock} from './clock';

const fields = [
  new Field('close', new Float64(), false),
  new Field('provisional', new Bool(), false),
];
const timedSchema = new Schema([
  new Field('time', new TimestampMillisecond(), false),
  ...fields,
]);
type Row = {
  time: number;
  close: number;
  provisional: boolean;
};
const row = (time: number, close: number, provisional = false): Row => ({
  time,
  close,
  provisional,
});
const stream = (source: Subject<Row>) => new DataStream(timedSchema, source);

function observe(node: Node) {
  const values: Datum[] = [];
  const errors: unknown[] = [];
  node.to({
    next: value => values.push(value),
    error: error => errors.push(error),
  });
  return {values, errors};
}

test('provisional attempts preserve varip, roll back var, and commit history once', () => {
  const source = new Subject<Row>();
  const node = tea`
    var float total = 0.0
    varip int attempts = 0
    total := total + close
    attempts := attempts + 1
    emit "total" total
    emit "attempts" attempts
    emit "previous" total[1]
    emit.append "events" close
  `.bind(stream(source));
  const result = observe(node);
  source.next(row(10, 2, true));
  source.next(row(10, 3, true));
  source.next(row(10, 4));
  source.next(row(20, 5, true));
  source.next(row(20, 6));
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [
      value.index,
      value.provisional,
      value.total,
      value.attempts,
      value.previous,
      value.events,
    ]),
  ).toEqual([
    [0, true, 2, 1, NaN, [2]],
    [0, true, 3, 2, NaN, [3]],
    [0, false, 4, 3, NaN, [4]],
    [1, true, 9, 4, 4, [5]],
    [1, false, 10, 5, 4, [6]],
  ]);
  node.dispose();
});

test.each([
  [row(10, 1), row(10, 2), 'committed timestamp'],
  [row(10, 1), row(9, 2), 'nondecreasing'],
  [row(10, 1, true), row(20, 2), 'finalize its provisional step'],
] as const)(
  'invalid source progression fails before another runtime attempt',
  (first, second, message) => {
    const result = observe(
      tea`emit "value" close`.bind(
        new DataStream(timedSchema, of(first, second)),
      ),
    );
    expect(result.values).toHaveLength(1);
    expect(String(result.errors[0])).toContain(message);
  },
);

test('current HTF child may refine an older open time without revising committed parent rows', () => {
  const main = new Subject<Row>();
  const child = new Subject<Row>();
  const node = tea`
    requested = request.security("X", "2", close)
    emit "value" requested
  `
    .bind(stream(main))
    .bind({requested: stream(child)});
  const result = observe(node);
  child.next(row(0, 10, true));
  main.next(row(1, 1));
  child.next(row(0, 20, true));
  expect(result.values).toHaveLength(1);
  main.next(row(2, 2, true));
  child.next(row(0, 30));
  main.next(row(2, 3));
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [value.index, value.provisional, value.value]),
  ).toEqual([
    [0, false, 10],
    [1, true, 20],
    [1, false, 30],
  ]);
  child.next(row(1, 40));
  expect(result.values).toHaveLength(3);
  main.next(row(3, 4));
  expect(result.errors).toEqual([]);
  expect(result.values.at(-1)).toMatchObject({index: 2, value: 40});
  node.dispose();
});

test.each(['carry', 'sparse'])(
  'late scalar steps preserve child history and parent commits with %s fill',
  fill => {
    const main = new Subject<Row>();
    const child = new Subject<Row>();
    const node = tea`
      requested = request.security("X", "5", close + nz(close[1], 0), fill="${fill}")
      var int commits = 0
      commits := commits + 1
      emit "value" requested
      emit "commits" commits
    `
      .bind(stream(main))
      .bind({requested: stream(child)});
    const result = observe(node);
    child.next(row(0, 10));
    main.next(row(7, 1));
    const committed = {...result.values[0]!};

    // The first live higher-timeframe bar opens before the historical tail.
    child.next(row(5, 30, true));
    expect(result.values).toEqual([committed]);
    main.next(row(8, 2, true));
    child.next(row(5, 40));
    expect(result.values).toHaveLength(2);
    main.next(row(8, 3));
    main.next(row(12, 4));

    // The same ordering can occur at every subsequent higher-timeframe boundary.
    child.next(row(10, 50, true));
    expect(result.values).toHaveLength(4);
    main.next(row(13, 5, true));
    child.next(row(10, 60));
    expect(result.values).toHaveLength(5);
    main.next(row(13, 6));

    // Future child values must still wait for an eligible parent timestamp.
    child.next(row(15, 70));
    child.complete();
    main.next(row(14, 7));
    main.next(row(15, 8));
    expect(result.errors).toEqual([]);
    expect(result.values[0]).toEqual(committed);
    expect(
      result.values.map(value => [
        value.index,
        value.provisional,
        value.value,
        value.commits,
      ]),
    ).toEqual([
      [0, false, 10, 1],
      [1, true, 40, 2],
      [1, false, 50, 2],
      [2, false, fill === 'carry' ? 50 : NaN, 3],
      [3, true, 90, 4],
      [3, false, 100, 4],
      [4, false, fill === 'carry' ? 100 : NaN, 5],
      [5, false, 130, 6],
    ]);
    node.dispose();
  },
);

test('multiple metrics sample late higher-timeframe children independently', () => {
  const main = new Subject<Row>();
  const five = new Subject<Row>();
  const fifteen = new Subject<Row>();
  const node = tea`
    fiveClose = request.security("X", "5", close)
    fiveAverage = request.security("X", "5", ta.sma(close, 2))
    fifteenClose = request.security("Y", "15", close)
    emit "fiveClose" fiveClose
    emit "fiveAverage" fiveAverage
    emit "fifteenClose" fifteenClose
  `
    .bind(stream(main))
    .bind({
      fiveClose: stream(five),
      fiveAverage: stream(five),
      fifteenClose: stream(fifteen),
    });
  const result = observe(node);
  five.next(row(0, 10));
  five.next(row(5, 20));
  fifteen.next(row(0, 100));
  main.next(row(17, 1));
  fifteen.next(row(15, 200, true));
  five.next(row(15, 30, true));
  expect(result.values).toHaveLength(1);
  main.next(row(18, 2, true));
  five.next(row(15, 40));
  fifteen.next(row(15, 210));
  expect(result.values).toHaveLength(2);
  main.next(row(18, 3));
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [
      value.index,
      value.provisional,
      value.fiveClose,
      value.fiveAverage,
      value.fifteenClose,
    ]),
  ).toEqual([
    [0, false, 20, 15, 100],
    [1, true, 30, 25, 200],
    [1, false, 40, 30, 210],
  ]);
  node.dispose();
});

test.each([
  [row(5, 1), row(5, 2), 'committed timestamp'],
  [row(5, 1), row(4, 2), 'nondecreasing'],
  [row(5, 1, true), row(6, 2), 'finalize its provisional step'],
] as const)(
  'late scalar children still reject invalid source progression',
  (first, second, message) => {
    const main = new Subject<Row>();
    const child = new Subject<Row>();
    const node = tea`
      requested = request.security("X", "5", close)
      emit "value" requested
    `
      .bind(stream(main))
      .bind({requested: stream(child)});
    const result = observe(node);
    main.next(row(7, 1));
    child.next(first);
    main.next(row(8, 2));
    expect(result.errors).toEqual([]);
    child.next(second);
    expect(result.errors).toHaveLength(1);
    expect(String(result.errors[0])).toContain(message);
    expect(result.values.map(value => value.value)).toEqual([NaN, 1]);
    node.dispose();
  },
);

test('collect windows retain earlier children during repeated parent attempts and replace child attempts', () => {
  const main = new Subject<Row>();
  const child = new Subject<Row>();
  const node = tea`
    lower = request.security_lower_tf("X", "", close)
    emit "count" lower.size()
    emit "first" lower.first()
    emit "last" lower.last()
  `
    .bind(stream(main))
    .bind({lower: stream(child)});
  const result = observe(node);
  child.next(row(5, 1));
  child.next(row(10, 2, true));
  main.next(row(10, 10, true));
  child.next(row(10, 3, true));
  main.next(row(10, 11, true));
  child.next(row(10, 4));
  main.next(row(10, 12));
  child.next(row(20, 5));
  main.next(row(20, 20));
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [
      value.index,
      value.count,
      value.first,
      value.last,
    ]),
  ).toEqual([
    [0, 2, 1, 2],
    [0, 2, 1, 3],
    [0, 2, 1, 4],
    [1, 1, 5, 5],
  ]);
  node.dispose();
});

test('sparse sampling advances on final parent steps, not provisional attempts', () => {
  const main = new Subject<Row>();
  const child = new Subject<Row>();
  const node = tea`
    requested = request.security("X", "2", close, fill="sparse")
    emit "value" requested
  `
    .bind(stream(main))
    .bind({requested: stream(child)});
  const result = observe(node);
  child.next(row(1, 10));
  main.next(row(1, 1, true));
  main.next(row(1, 2));
  main.next(row(2, 3));
  expect(result.errors).toEqual([]);
  expect(result.values.map(value => value.value)).toEqual([10, 10, NaN]);
  node.dispose();
});

test('attempt metadata is validated at binding and partial streams must agree', () => {
  expect(() =>
    tea`emit "value" close`.bind(
      new DataStream(
        new Schema([
          new Field('close', new Float64(), false),
          new Field('provisional', new Bool(), true),
        ]),
        of({close: 1, provisional: null}),
      ),
    ),
  ).toThrow('non-nullable Bool');
  const node = tea`emit "value" close + open`.bind({
    close: new DataStream(timedSchema, of(row(1, 1, true))),
    open: new DataStream(
      new Schema([
        new Field('time', new TimestampMillisecond(), false),
        new Field('open', new Float64(), false),
      ]),
      of({time: 1, open: 1}),
    ),
  });
  const result = observe(node);
  expect(result.values).toEqual([]);
  expect(String(result.errors[0])).toContain('provisional states disagree');
});

test('positional requests wait for child finalization and preserve its logical step across parent attempts', () => {
  const main = new Subject<Omit<Row, 'time'>>();
  const child = new Subject<Omit<Row, 'time'>>();
  const schema = new Schema(fields);
  const node = tea`
    requested = request.security("X", "", close)
    emit "value" requested
  `
    .bind(new DataStream(schema, main))
    .bind({requested: new DataStream(schema, child)});
  const result = observe(node);
  child.next({close: 1, provisional: true});
  main.next({close: 10, provisional: true});
  main.next({close: 10, provisional: false});
  expect(result.values).toHaveLength(1);
  child.next({close: 2, provisional: false});
  child.next({close: 3, provisional: false});
  main.next({close: 20, provisional: false});
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [value.index, value.provisional, value.value]),
  ).toEqual([
    [0, true, 1],
    [0, false, 2],
    [1, false, 3],
  ]);
  node.dispose();
});

test('count windows count child steps, not provisional notifications', () => {
  const main = new Subject<Omit<Row, 'time'>>();
  const child = new Subject<Omit<Row, 'time'>>();
  const schema = new Schema(fields);
  const node = tea`
    lower = request.security_lower_tf("X", "1", close)
    emit "count" lower.size()
    emit "last" lower.last()
  `
    .bind(new DataStream(schema, main, (2n * m) as Clock))
    .bind({lower: new DataStream(schema, child, m)});
  const result = observe(node);
  child.next({close: 1, provisional: false});
  child.next({close: 2, provisional: true});
  child.next({close: 3, provisional: true});
  main.next({close: 10, provisional: true});
  main.next({close: 10, provisional: false});
  expect(result.values).toHaveLength(1);
  child.next({close: 4, provisional: false});
  expect(result.errors).toEqual([]);
  expect(
    result.values.map(value => [value.index, value.count, value.last]),
  ).toEqual([
    [0, 2, 3],
    [0, 2, 4],
  ]);
  node.dispose();
});
