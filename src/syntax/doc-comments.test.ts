// Purpose: Doc comments — which block documents a declaration, and how its text splits into summary, body and tags.

import {describe, expect, test} from 'vitest';
import {docCommentAbove, parseDocComment} from './doc-comments';

const above = (source: string) => {
  const lines = source.split('\n');
  return docCommentAbove(lines, lines.length);
};

describe('docCommentAbove', () => {
  test('reads one-line and starred multi-line blocks', () => {
    expect(above('/** Midpoint. */\nmid(a, b) => 0')?.summary).toBe(
      'Midpoint.',
    );
    const doc = above(
      [
        '\t/**',
        '\t * Midpoint of',
        '\t * two prices.',
        '\t *',
        '\t * ```tea',
        '\t * if true',
        '\t *     x = 1',
        '\t * ```',
        '\t */',
        '\tfloat mid() =>',
      ].join('\n'),
    );
    expect(doc?.summary).toBe('Midpoint of two prices.');
    expect(doc?.body).toBe('```tea\nif true\n    x = 1\n```');
  });

  test('reads a block without leading stars, keeping relative indentation', () => {
    expect(above('/**\nMidpoint.\n*/\nmid(a, b) => 0')?.summary).toBe(
      'Midpoint.',
    );
    const doc = above(
      [
        '\t/**',
        '\tMidpoint.',
        '',
        '\t```tea',
        '\tif true',
        '\t    x = 1',
        '\t```',
        '\t*/',
        '\tfloat mid() =>',
      ].join('\n'),
    );
    expect(doc?.body).toBe('```tea\nif true\n    x = 1\n```');
  });

  test('finds the opening line even when the text mentions /*', () => {
    expect(
      above('/**\n * Midpoint.\n *\n * Not a /* comment.\n */\nmid(a, b) => 0')
        ?.body,
    ).toBe('Not a /* comment.');
  });

  test('ignores comments that are not doc comments or not directly above', () => {
    expect(above('/* Midpoint. */\nmid(a, b) => 0')).toBeNull();
    expect(above('/**/\nmid(a, b) => 0')).toBeNull();
    expect(above('// Midpoint.\nmid(a, b) => 0')).toBeNull();
    expect(above('/** Midpoint. */\n\nmid(a, b) => 0')).toBeNull();
    expect(above('mid(a, b) => 0')).toBeNull();
  });
});

describe('parseDocComment', () => {
  test('splits prose from tags; a tag runs until the next one', () => {
    const doc = parseDocComment(
      [
        'Midpoint.',
        '',
        'More detail.',
        '',
        '@param a First',
        'price.',
        '@param b Second price.',
        '@returns The average.',
        '@category Bands',
      ].join('\n'),
    );
    expect(doc).toEqual({
      summary: 'Midpoint.',
      body: 'More detail.',
      params: new Map([
        ['a', 'First price.'],
        ['b', 'Second price.'],
      ]),
      returns: 'The average.',
      category: 'Bands',
      formula: null,
      warmup: null,
      examples: [],
      pine: null,
      see: [],
    });
  });

  test('keeps line breaks in block tags and joins one-line tags', () => {
    const doc = parseDocComment(
      [
        'Mean.',
        '@formula',
        '\\frac{1}{n}',
        '  \\sum x',
        '@warmup `na` until',
        'the window fills.',
        '@pine Pine skips',
        '`na`.',
        '@see ta.ema',
        '@see',
        'ta.rma',
      ].join('\n'),
    );
    expect(doc.formula).toBe('\\frac{1}{n}\n  \\sum x');
    expect(doc.warmup).toBe('`na` until\nthe window fills.');
    expect(doc.pine).toBe('Pine skips\n`na`.');
    expect(doc.see).toEqual(['ta.ema', 'ta.rma']);
  });

  test('reads an example as caption, program and CSV', () => {
    const doc = parseDocComment(
      [
        'Doubles.',
        '@example',
        'On two bars.',
        '```tea',
        '@x = 1',
        'emit "x" close * 2',
        '```',
        '```csv',
        'time,close',
        '0,1',
        '```',
        '@example',
        'Without data.',
        '```tea',
        'emit "one" 1',
        '```',
        '@example No program.',
      ].join('\n'),
    );
    expect(doc.examples).toEqual([
      {
        caption: 'On two bars.',
        source: '@x = 1\nemit "x" close * 2',
        csv: 'time,close\n0,1',
      },
      {caption: 'Without data.', source: 'emit "one" 1', csv: null},
      {caption: 'No program.', source: '', csv: null},
    ]);
  });

  test('drops unknown tags and malformed params instead of failing', () => {
    const doc = parseDocComment(
      'Midpoint.\n@deprecated soon\n@param\n@returns x',
    );
    expect(doc.params.size).toBe(0);
    expect(doc.returns).toBe('x');
    expect(doc.body).toBe('');
  });
});
