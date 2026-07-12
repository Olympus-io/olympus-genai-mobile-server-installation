import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Olympus Platform',
  tagline: 'Self-hosted enterprise file management + GenAI — install in 15 minutes',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // Served from the custom domain configured by website/static/CNAME.
  // If the CNAME is ever removed, revert to:
  //   url: 'https://olympus-io.github.io'
  //   baseUrl: '/olympus-genai-mobile-server-installation/'
  url: 'https://setup.olympus.io',
  baseUrl: '/',

  organizationName: 'Olympus-io',
  projectName: 'olympus-genai-mobile-server-installation',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
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
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl:
            'https://github.com/Olympus-io/olympus-genai-mobile-server-installation/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Olympus',
      logo: {
        alt: 'Olympus',
        src: 'img/logo.png',
        height: 28,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'installSidebar',
          position: 'left',
          label: 'Install Guide',
        },
        {
          href: 'https://www.olympus.io',
          label: 'olympus.io',
          position: 'right',
        },
        {
          href: 'https://github.com/Olympus-io/olympus-genai-mobile-server-installation',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Install',
          items: [
            { label: 'Get Started', to: '/docs/intro' },
            { label: 'System Requirements', to: '/docs/system-requirements' },
            { label: 'Run the Installer', to: '/docs/install' },
            { label: 'Troubleshooting', to: '/docs/troubleshooting' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'Olympus Website', href: 'https://www.olympus.io' },
            {
              label: 'API Reference (Postman)',
              href: 'https://github.com/Olympus-io/olympus-genai-mobile-server-installation/tree/main/postman-collection',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            { label: 'Email: support@olympus.io', href: 'mailto:support@olympus.io' },
            {
              label: 'Issues',
              href: 'https://github.com/Olympus-io/olympus-genai-mobile-server-installation/issues',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Olympus. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'powershell', 'batch', 'yaml', 'json', 'nginx', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
