// Purpose: Adapt Tea's generated lexical rules to the offline renderer's Prism tokens.
import type {PrismGrammar} from 'prism-react-renderer';
import grammar from '../../docs/assets/tea.tmLanguage.json';

const rules = grammar.repository;

export const teaPrismGrammar: PrismGrammar = {
  comment: {pattern: /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/, greedy: true},
  string: {
    pattern: /"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'/,
    greedy: true,
  },
  keyword: [
    ...rules['storage-modifiers'].patterns,
    ...rules['control-keywords'].patterns,
  ].map(rule => new RegExp(rule.match)),
  builtin: new RegExp(rules['type-references'].patterns[1]!.match),
  constant: rules['language-constants'].patterns.map(
    rule => new RegExp(rule.match),
  ),
  function: rules['function-calls'].patterns.map(
    rule => new RegExp(rule.match),
  ),
  number: rules.numbers.patterns.map(rule => new RegExp(rule.match)),
  operator: rules.operators.patterns.map(rule => new RegExp(rule.match)),
  punctuation: rules.punctuation.patterns.map(rule => new RegExp(rule.match)),
};
