// Purpose: Keep Tea examples colored without tokenizing comments or strings as code.
import Prism from 'prismjs';
import {expect, test} from 'vitest';
import grammar from '../../docs/assets/tea.tmLanguage.json';
import {teaPrismGrammar} from '../../website/src/tea-prism';

test('Tea code fences have a matching grammar and distinct lexical tokens', () => {
  expect(grammar.name).toBe('tea');
  expect(grammar.scopeName).toBe('source.tea');
  const html = Prism.highlight(
    'var float average = ta.sma(close, 3)\nemit "if // literal" average // emit true',
    teaPrismGrammar,
    'tea',
  );
  expect(html).toContain('<span class="token keyword">var</span>');
  expect(html).toContain('<span class="token builtin">float</span>');
  expect(html).toContain('<span class="token function">sma</span>');
  expect(html).toContain('<span class="token string">"if // literal"</span>');
  expect(html).toContain('<span class="token comment">// emit true</span>');
});
