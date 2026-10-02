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

  test('reads a block without leading stars', () => {
    expect(above('/**\nMidpoint.\n*/\nmid(a, b) => 0')?.summary).toBe(
      'Midpoint.',
    );
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
    });
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
