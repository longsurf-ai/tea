// Purpose: Derive the offline site's sidebars from docs.json, the one owner of Tea's navigation.

import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

interface NavigationGroup {
  readonly group: string;
  readonly root?: string;
  readonly pages: readonly (string | NavigationGroup)[];
}

interface Navigation {
  readonly navigation: {
    readonly tabs: readonly {
      readonly tab: string;
      readonly groups: readonly NavigationGroup[];
    }[];
  };
}

const {navigation} = JSON.parse(
  readFileSync(path.join(__dirname, '../docs/docs.json'), 'utf8'),
) as Navigation;

interface Category {
  type: 'category';
  label: string;
  link?: {type: 'doc'; id: string};
  items: (string | Category)[];
}

function category(group: NavigationGroup): Category {
  return {
    type: 'category',
    label: group.group,
    ...(group.root === undefined ? {} : {link: {type: 'doc', id: group.root}}),
    items: group.pages.map(page =>
      typeof page === 'string' ? page : category(page),
    ),
  };
}

// Each docs.json tab is one navbar sidebar: "Documentation" becomes
// documentationSidebar, which docusaurus.config.ts names.
const sidebars: SidebarsConfig = Object.fromEntries(
  navigation.tabs.map(tab => [
    `${tab.tab.toLowerCase()}Sidebar`,
    tab.groups.map(category),
  ]),
);

export default sidebars;
