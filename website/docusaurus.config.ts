// Purpose: Configure the standalone Tea documentation and reference website.

import type {Config} from '@docusaurus/types';
import {themes as prismThemes} from 'prism-react-renderer';

// remark-math and rehype-katex are ESM-only, so the config loads them in an
// async function; formulas render through the bundled KaTeX stylesheet.
export default async function createConfig(): Promise<Config> {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  return {
    title: 'Tea',
    tagline: 'Documentation for the Tea programming language.',
    url: process.env['TEA_DOCS_URL'] ?? 'http://localhost',
    baseUrl: '/',
    favicon: 'tea-mark.svg',
    staticDirectories: ['../docs/assets'],
    onBrokenLinks: 'throw',
    onBrokenAnchors: 'throw',
    markdown: {
      hooks: {
        onBrokenMarkdownLinks: 'throw',
      },
    },
    i18n: {
      defaultLocale: 'en',
      locales: ['en'],
    },
    presets: [
      [
        'classic',
        {
          docs: {
            path: '../docs',
            routeBasePath: '/',
            sidebarPath: './sidebars.ts',
            exclude: ['**/AGENTS.md', '**/CLAUDE.md'],
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          },
          blog: false,
          pages: false,
          theme: {
            customCss: [
              require.resolve('katex/dist/katex.min.css'),
              './src/css/custom.css',
            ],
          },
        },
      ],
    ],
    themeConfig: {
      navbar: {
        logo: {
          alt: 'Tea',
          src: 'tea-logo-light.svg',
          srcDark: 'tea-logo-dark.svg',
          width: 90,
          height: 32,
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'documentationSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docSidebar',
            sidebarId: 'referenceSidebar',
            position: 'left',
            label: 'Reference',
          },
        ],
      },
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'python'],
      },
    },
  };
}
