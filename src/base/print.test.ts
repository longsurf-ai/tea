// Purpose: Errors queueing — one report per source line until a flush, then a fresh queue.

import {expect, test} from 'vitest';
import {newFileBase, type Pos} from './pos';
import {Errors} from './print';

const base = newFileBase('a.tea');
const at = (line: number, col = 1): Pos => ({base, line, col});

test('keeps the first report per line and starts fresh after a flush', () => {
  const errors = new Errors();
  errors.errorAt(at(3), 'first');
  errors.errorAt(at(3, 5), 'same line');
  expect(errors.flushErrors().map(error => error.msg)).toEqual(['first']);

  // The line-3 marker belongs to the flushed queue, not to the next one.
  errors.errorAt(at(3), 'after flush');
  expect(errors.flushErrors().map(error => error.msg)).toEqual(['after flush']);
});
