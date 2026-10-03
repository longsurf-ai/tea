// Purpose: The Tea reference manual as data, for hosts that show it in their own UI.

/**
 * The Tea reference manual as data: the Language, Built-ins and Libraries
 * pages of the published reference, generated from the same sources by
 * `scripts/docs/generate-reference.ts`. A host renders {@link referenceManual}
 * with its own components, such as an editor's in-app manual.
 *
 * Prose fields are Markdown. A link whose target starts with `#` stays inside
 * the manual: `#ta.sma` names an entry by its {@link ReferenceEntry.id}, and
 * `#reference/builtins/ta` names a page by its {@link ReferencePage.id}; entry
 * ids never contain `/`. Links to pages outside the manual keep only their
 * text.
 *
 * @packageDocumentation
 */

import manual from './manual.json';

/** One parameter of an entry, or a parameter a page documents once. */
export interface ReferenceParameter {
  readonly name: string;
  /** Qualifier and type, such as `series float`; null where Tea infers it. */
  readonly type: string | null;
  /** The default written in the declaration, or null when it has none. */
  readonly defaultValue: string | null;
  readonly description: string;
}

/** One documented name: a function, value, constant family, type or enum. */
export interface ReferenceEntry {
  /** As code writes it, unique in the manual: `ta.sma`, `color.*`, `plot`. */
  readonly id: string;
  /**
   * Every name this entry documents: its id, or each constant of a family
   * such as `color.*`. The language server's `tea/referenceName` answers one.
   */
  readonly symbols: readonly string[];
  readonly kind:
    | 'function'
    | 'variable'
    | 'constant'
    | 'type'
    | 'enum'
    | 'interface';
  /** The section of its page, such as `Moving averages`. */
  readonly category: string;
  /** One sentence. */
  readonly summary: string;
  /** One per overload; a long one spans lines with a parameter on each. */
  readonly signatures: readonly string[];
  readonly parameters: readonly ReferenceParameter[];
  readonly returns: string | null;
  /** A table of members or constants, with Markdown cells. */
  readonly members: {
    readonly columns: readonly string[];
    readonly rows: readonly (readonly string[])[];
  } | null;
  /** Details and examples. */
  readonly body: string;
}

/**
 * One page: a hand-written article of the Language section, or a namespace
 * of entries such as `ta` or `trade`.
 */
export type ReferencePage =
  | {
      readonly kind: 'article';
      /** The page's route, such as `reference/language/types`. */
      readonly id: string;
      readonly title: string;
      readonly description: string;
      readonly markdown: string;
    }
  | {
      readonly kind: 'entries';
      /** The page's route, such as `reference/builtins/ta`. */
      readonly id: string;
      readonly title: string;
      readonly description: string;
      readonly intro: string;
      /** Parameters every entry of the page may take, such as `input`'s `title`. */
      readonly commonParameters: readonly ReferenceParameter[];
      readonly entries: readonly ReferenceEntry[];
    };

/** The manual's pages in reading order, grouped as the published reference groups them. */
export interface ReferenceManual {
  readonly groups: readonly {
    readonly title: string;
    readonly pages: readonly ReferencePage[];
  }[];
}

/**
 * The manual for the Tea version this package is.
 *
 * @example
 * ```ts
 * import {referenceManual} from 'tea/reference';
 *
 * const ta = referenceManual.groups
 *   .flatMap(group => group.pages)
 *   .find(page => page.id === 'reference/builtins/ta');
 * ```
 */
export const referenceManual = manual as ReferenceManual;
