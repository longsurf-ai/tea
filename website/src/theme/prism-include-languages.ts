// Purpose: Register Tea alongside Docusaurus's configured languages.
import includeDefaultLanguages from '@theme-original/prism-include-languages';
import type {PrismLib} from 'prism-react-renderer';
import {teaPrismGrammar} from '../tea-prism';

export default function prismIncludeLanguages(prism: PrismLib): void {
  includeDefaultLanguages(prism);
  prism.languages.tea = teaPrismGrammar;
}
