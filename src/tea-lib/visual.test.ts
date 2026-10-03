// Visuals use ordinary function instances and named output columns.

import {describe, expect, test} from 'vitest';
import {CallKind} from '../checker/info';
import {checkText} from '../checker/testing';
import {funcsOf} from '../ir/visit';
import {mustBuild} from '../noder/testing';
import {csvStream, executeTestProgram} from '../testing/batch';
import {OutputCapture} from '../testing/output';

describe('visual prelude', () => {
  test('exposes plot as an ordinary function with a constant output ID', () => {
    const result = checkText(
      'p = plot("price", close, "Close", style=plot.style_columns)',
    );
    expect(result.errors).toEqual([]);
    const call = [...result.info.calls.values()].find(
      call => call.kind === CallKind.Function && call.instance.name === 'plot',
    );
    expect(call?.kind).toBe(CallKind.Function);
    if (call?.kind === CallKind.Function) {
      expect(call.instance.template.pkg.path).toBe('visual');
      expect(call.instance.resultType).toMatchObject({
        kind: 'Struct',
        name: 'Plot',
      });
    }
  });

  test('plot IDs name distinct columns and fill returns ordinary visual data', async () => {
    const program = mustBuild(
      [
        'first = plot("close", close, "Close")',
        'second = plot("open", open, "Open")',
        'fill("band", first, second, color=color.blue)',
        'first.series := 999',
      ].join('\n'),
    );
    expect(program.outputs.map(output => [output.name, output.mode])).toEqual([
      ['close', 'set'],
      ['open', 'set'],
      ['band', 'set'],
    ]);
    expect(funcsOf(program).filter(func => func.name === 'plot')).toHaveLength(
      2,
    );
    const sink = new OutputCapture();
    await executeTestProgram(program, {
      stream: csvStream('close,open\n10,8\n'),
      sink,
    });
    expect(sink.publications[0]).toMatchObject({
      close: {id: 'close', series: 10, title: 'Close'},
      open: {id: 'open', series: 8, title: 'Open'},
      band: {
        id: 'band',
        first: 'close',
        second: 'open',
        color: {r: 33, g: 150, b: 243, a: 255},
      },
    });
  });

  test('verticalProfile writes its time box with nested rows, parts and levels', async () => {
    const program = mustBuild(
      [
        'part = ProfileSegment.new(volume, color.green)',
        'rows = array.from(ProfileRow.new(low, high, array.from(part)))',
        'levels = array.from(ProfileLevel.new(close, color.orange))',
        'verticalProfile("vp", time, time + 60000, rows, levels, "VP")',
      ].join('\n'),
    );
    const sink = new OutputCapture();
    await executeTestProgram(program, {
      stream: csvStream('time,high,low,close,volume\n0,11,9,10,500\n'),
      sink,
    });
    expect(sink.publications[0]).toMatchObject({
      vp: {
        id: 'vp',
        from: 0,
        to: 60000,
        title: 'VP',
        rows: [{low: 9, high: 11, segments: [{value: 500, color: {a: 255}}]}],
        levels: [{y: 10, color: {a: 255}}],
      },
    });
  });

  test('rejects duplicate plot IDs even when values have the same type', () => {
    expect(
      checkText('plot("price", close)\nplot("price", open)').errors.some(
        error =>
          error.msg.includes('price') &&
          error.msg.includes('plain emit writer'),
      ),
    ).toBe(true);
  });
});
