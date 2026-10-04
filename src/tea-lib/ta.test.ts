// Purpose: Pin numerical contracts for Tea-authored statistics and indicators.

import {describe, expect, test} from 'vitest';
import {mustBuild} from '../noder/testing';
import {arrayStream, csvStream, executeTestProgram} from '../testing/batch';
import {OutputCapture} from '../testing/output';

const DATA = [
  'time,open,high,low,close',
  '1,9,10,8,9',
  '2,10,12,9,11',
  '3,10,11,7,10',
  '4,10,13,9,12',
  '5,12,12,8,9',
  '6,10,15,10,14',
  '7,14,14,9,10',
  '8,11,16,11,15',
  '',
].join('\n');

describe('ta variance', () => {
  test.each([
    {
      name: 'constant decimal window',
      values: Array(22).fill(1.2),
      length: 20,
      population: 0,
      sample: 0,
    },
    {
      name: 'small spread at a large offset',
      values: [1e12, 1e12, 1e12 + 0.125],
      length: 3,
      population: 1 / 288,
      sample: 1 / 192,
    },
    {
      name: 'population singleton',
      values: [1.2],
      length: 1,
      population: 0,
      sample: NaN,
    },
    {
      name: 'a missing value in the window is left out',
      values: [1.2, NaN, 1.3],
      length: 3,
      population: 0.0025,
      sample: 0.005,
    },
    {
      name: 'a window of missing values has no variance',
      values: [NaN, NaN, NaN],
      length: 3,
      population: NaN,
      sample: NaN,
    },
    {
      name: 'recovery after missing value leaves window',
      values: [NaN, 1.2, 1.2, 1.2],
      length: 3,
      population: 0,
      sample: 0,
    },
  ])('$name', async ({values, length, population, sample}) => {
    const program = mustBuild(
      [
        `emit "population" ta.variance(close, ${length}, true)`,
        `emit "sample" ta.variance(close, ${length}, false)`,
        `emit "stdev" ta.stdev(close, ${length}, true)`,
      ].join('\n'),
    );
    const sink = new OutputCapture();
    await executeTestProgram(program, {
      stream: arrayStream({close: values}),
      sink,
    });
    for (const [outputId, expected] of [
      population,
      sample,
      Math.sqrt(population),
    ].entries()) {
      const results = sink.emissions
        .filter(value => value.outputId === outputId)
        .map(value => value.channels[0] as number);
      expect(results.slice(0, length - 1).every(Number.isNaN)).toBe(true);
      const actual = results.at(-1);
      if (Number.isNaN(expected)) expect(actual).toBeNaN();
      else if (expected === 0) expect(actual).toBe(0);
      else expect(actual).toBeCloseTo(expected, 12);
    }
  });
});

describe('ta Wilder indicators', () => {
  test('SMA-seeds RMA, ATR, RSI, and DMI from the required samples', async () => {
    const program = mustBuild(
      [
        'average = ta.rma(close, 3)',
        'range = ta.atr(3)',
        'strength = ta.rsi(close, 3)',
        '[plus, minus, adx] = ta.dmi(3, 3)',
        'emit "RMA" average',
        'emit "ATR" range',
        'emit "RSI" strength',
        'emit "+DI" plus',
        'emit "-DI" minus',
        'emit "ADX" adx',
      ].join('\n'),
    );
    const sink = new OutputCapture();
    await executeTestProgram(program, {
      stream: csvStream(DATA),
      sink,
      timeNow: 1_800_000_000_000,
    });

    const values = (outputId: number): number[] =>
      sink.emissions
        .filter(emission => emission.outputId === outputId)
        .map(emission => emission.channels[0] as number);
    const finiteAt = (outputId: number, row: number, expected: number): void =>
      expect(values(outputId)[row]).toBeCloseTo(expected, 12);

    expect(values(0).slice(0, 2).every(Number.isNaN)).toBe(true);
    finiteAt(0, 2, 10);
    finiteAt(0, 7, 12.292181069958849);

    expect(values(1).slice(0, 2).every(Number.isNaN)).toBe(true);
    finiteAt(1, 2, 3);
    finiteAt(1, 7, 5.053497942386831);

    expect(values(2).slice(0, 3).every(Number.isNaN)).toBe(true);
    finiteAt(2, 3, 80);
    finiteAt(2, 7, 68.10073452256033);

    // Bar 0 has no moves and no true range, so DMI's averages start from
    // bars 1 to 3: +DM 2, 0, 2; -DM 0, 2, 0; true range 3, 4, 4.
    expect(values(3).slice(0, 3).every(Number.isNaN)).toBe(true);
    expect(values(4).slice(0, 3).every(Number.isNaN)).toBe(true);
    finiteAt(3, 3, 400 / 11);
    finiteAt(4, 3, 200 / 11);
    expect(values(5).slice(0, 5).every(Number.isNaN)).toBe(true);
    finiteAt(5, 5, 30.292397660818715);
    finiteAt(5, 7, 35.16584146669999);
  });
});

describe('ta crosses and integer inputs', () => {
  async function run(lines: readonly string[], close: readonly number[]) {
    const sink = new OutputCapture();
    await executeTestProgram(mustBuild(lines.join('\n')), {
      stream: arrayStream({close}),
      sink,
    });
    return (outputId: number): unknown[] =>
      sink.emissions
        .filter(emission => emission.outputId === outputId)
        .map(emission => emission.channels[0]);
  }

  test('cross sees a down-cross on the bar right after an up-cross', async () => {
    const values = await run(
      ['emit "cross" ta.cross(close, 2)'],
      [1, 3, 1, 3, 1],
    );
    expect(values(0)).toEqual([false, true, true, true, true]);
  });

  test('averages and rates of int series keep their fractions', async () => {
    const values = await run(
      [
        'emit "roc" ta.roc(bar_index, 1)',
        'emit "swma" ta.swma(bar_index)',
        'emit "stoch" ta.stoch(bar_index, bar_index + 4, bar_index, 3)',
        'emit "almaInt" ta.alma(bar_index, 9, 0.85, 6)',
        'emit "almaFloat" ta.alma(bar_index, 9, 0.85, 6.0)',
      ],
      Array(10).fill(1),
    );
    expect(values(0)[4]).toBeCloseTo(100 / 3, 12);
    expect(values(1)[3]).toBeCloseTo(1.5, 12);
    expect(values(2)[3]).toBeCloseTo(100 / 3, 12);
    expect(values(3)[9]).toBeCloseTo(values(4)[9] as number, 12);
  });
});

describe('ta correlation', () => {
  async function correlations(
    source2: string,
    close: readonly number[],
    length = 3,
  ) {
    const sink = new OutputCapture();
    await executeTestProgram(
      mustBuild(`emit "r" ta.correlation(close, ${source2}, ${length})`),
      {stream: arrayStream({close}), sink},
    );
    return sink.emissions.map(emission => emission.channels[0] as number);
  }

  test('a constant window has no correlation, even a decimal one', async () => {
    const closes = [10, 12, 15, 11, 14, 12, 13];
    expect((await correlations('0.1', closes)).every(Number.isNaN)).toBe(true);
    const constants = await correlations('0.7', Array(5).fill(0.1));
    expect(constants.every(Number.isNaN)).toBe(true);
  });

  test('a perfect correlation is exactly 1, not just past it', async () => {
    // Without the clamp, rounding gives 1.0000000000000002 here.
    const values = await correlations('close * 1.1', [1.07, 3.32], 2);
    expect(values).toEqual([NaN, 1]);
  });
});

describe('ta lengths', () => {
  test('a length that reaches 0 while running stops the run', async () => {
    const sink = new OutputCapture();
    await expect(
      executeTestProgram(mustBuild('emit "s" ta.sma(close, bar_index)'), {
        stream: arrayStream({close: [1, 2, 3]}),
        sink,
      }),
    ).rejects.toThrow('RUNTIME_ERROR: ta.sma: length must be at least 1');
    expect(sink.emissions).toEqual([]);
  });
});

describe('ta matches Pine v6', () => {
  async function run(lines: readonly string[]) {
    const sink = new OutputCapture();
    await executeTestProgram(mustBuild(lines.join('\n')), {
      stream: csvStream(DATA),
      sink,
    });
    return (outputId: number): unknown[] =>
      sink.emissions
        .filter(emission => emission.outputId === outputId)
        .map(emission => emission.channels[0]);
  }

  test('tsi is a ratio from -1 to 1, not a percentage', async () => {
    const values = await run(['emit "tsi" ta.tsi(close, 2, 3)']);
    const tsi = values(0).filter(value => !Number.isNaN(value)) as number[];
    expect(tsi.length).toBeGreaterThan(0);
    expect(tsi.every(value => value >= -1 && value <= 1)).toBe(true);
  });

  test('percentrank is na while its window holds na, including warm-up', async () => {
    const values = await run([
      'x = bar_index == 5 ? na : close',
      'emit "rank" ta.percentrank(x, 2)',
    ]);
    // closes 9, 11, 10, 12, 9, 14, 10, 15; bar 5 is na.
    expect(values(0)).toEqual([NaN, NaN, 50, 100, 0, NaN, NaN, NaN]);
  });

  test('kc measures range with ta.tr(false), so its bands start on bar 1', async () => {
    const values = await run([
      '[m, upper, l] = ta.kc(close, 3, 1)',
      '[m2, upperHighLow, l2] = ta.kc(close, 3, 1, false)',
      'emit "upper" upper',
      'emit "upperHighLow" upperHighLow',
    ]);
    expect(values(0)[0]).toBeNaN();
    expect(values(0)[1]).not.toBeNaN();
    expect(values(1)[0]).not.toBeNaN();
  });

  test('alma takes Pine’s floor, and Pine’s parameter names work as named arguments', async () => {
    const values = await run([
      'emit "floored" ta.alma(close, 4, 0.85, 6, true)',
      'emit "peak2" ta.alma(close, 4, 2.0 / 3.0, 6)',
      'emit "tr" ta.tr(handle_na = false)',
      '[macdLine, s, h] = ta.macd(close, fastlen = 2, slowlen = 3, siglen = 2)',
      'emit "macd" macdLine',
      'emit "tsi" ta.tsi(close, short_length = 2, long_length = 3)',
    ]);
    // floor(0.85 * 3) = 2, the same peak as an offset of 2/3.
    expect(values(0).slice(3)).toEqual(values(1).slice(3));
    expect(values(2)[0]).toBeNaN();
    expect(values(3)[0]).toBe(0);
  });
});

describe('ta leaves na out of a full window', () => {
  async function run(lines: readonly string[], close: readonly number[]) {
    const sink = new OutputCapture();
    await executeTestProgram(mustBuild(lines.join('\n')), {
      stream: arrayStream({close}),
      sink,
    });
    return (outputId: number): unknown[] =>
      sink.emissions
        .filter(emission => emission.outputId === outputId)
        .map(emission => emission.channels[0]);
  }

  test('windows skip na values but keep their warm-up', async () => {
    const values = await run(
      [
        'emit "sma" ta.sma(close, 3)',
        'emit "highest" ta.highest(close, 3)',
        'emit "highestbars" ta.highestbars(close, 3)',
        'emit "variance" ta.variance(close, 3)',
        'emit "rising" ta.rising(close, 2)',
      ],
      [101, 102, 103, 104, 105, NaN, 107, 108],
    );
    expect(values(0)).toEqual([NaN, NaN, 102, 103, 104, 104.5, 106, 107.5]);
    expect(values(1)).toEqual([NaN, NaN, 103, 104, 105, 105, 107, 108]);
    // An offset of 0 may be -0; both read as 0.
    expect(values(2).map(value => (value as number) + 0)).toEqual([
      NaN,
      NaN,
      0,
      0,
      0,
      -1,
      0,
      0,
    ]);
    expect(values(3)[5]).toBeCloseTo(0.25, 12);
    // rising: above every known value of the previous two bars.
    expect(values(4)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  test('a window with no value left is na', async () => {
    const values = await run(['emit "sma" ta.sma(close, 2)'], [1, NaN, NaN, 4]);
    expect(values(0)).toEqual([NaN, 1, NaN, 4]);
  });

  test('running values skip an na bar and keep their value', async () => {
    const values = await run(
      [
        'emit "ema" ta.ema(close, 3)',
        'emit "cum" ta.cum(close)',
        'emit "max" ta.max(close)',
      ],
      [NaN, 2, NaN, 4],
    );
    expect(values(0)).toEqual([NaN, 2, 2, 3]);
    expect(values(1)).toEqual([NaN, 2, 2, 6]);
    expect(values(2)).toEqual([NaN, 2, 2, 4]);
  });

  test('hma uses the whole part of the square root and waits for it', async () => {
    const values = (
      await run(
        ['emit "hma" ta.hma(close, 7)'],
        Array.from({length: 12}, (_, i) => i),
      )
    )(0);
    // floor(sqrt(7)) = 2, so the first value is on bar 7 + 2 - 2. On a line
    // the inner averages cancel their lag and the outer one, over 2 bars,
    // trails by 1/3 of a bar.
    expect(values.slice(0, 7).every(value => Number.isNaN(value))).toBe(true);
    expect(values[7]).toBeCloseTo(7 + 1 / 3, 12);
  });
});

describe('ta computed exports', () => {
  const VOLUME = [
    'time,open,high,low,close,volume',
    '1,10,10,10,10,1',
    '2,10,11,10,11,2',
    '3,11,11,10,10,3',
    '4,10,10,10,10,4',
    '5,10,12,10,12,5',
    '',
  ].join('\n');

  test('ta.obv is computed on every bar and shared by every read', async () => {
    const sink = new OutputCapture();
    await executeTestProgram(
      mustBuild(
        [
          'emit "obv" ta.obv',
          'emit "previous" ta.obv[1]',
          'x = 0.0',
          'if bar_index == 4',
          '    x := ta.obv',
          'emit "late" x',
        ].join('\n'),
      ),
      {stream: csvStream(VOLUME), sink},
    );
    const values = (outputId: number) =>
      sink.emissions
        .filter(emission => emission.outputId === outputId)
        .map(emission => emission.channels[0]);
    expect(values(0)).toEqual([NaN, 2, -1, -1, 4]);
    expect(values(1)).toEqual([NaN, NaN, 2, -1, -1]);
    // Read only on the last bar, it still saw every bar.
    expect(values(2)[4]).toBe(4);
  });
});
