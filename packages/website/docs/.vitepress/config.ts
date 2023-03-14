import dotenv from "dotenv";
// import mdFootnote from "markdown-it-footnote";
// import { defineConfig, type HeadConfig } from 'vitepress';
import container from "markdown-it-container";
import { defineConfig, type HeadConfig } from "vitepress";
import { renderSandbox } from "vitepress-plugin-sandpack";
// import * as data from "../data";
// @ts-check
/** @type {import('vitepress').UserConfig} */

dotenv.config();

const SIDEBAR_DEFAULT = [
  {
    text: "Getting Started",
    items: [
      { text: "Introduction", link: "/docs/introduction" },
      { text: "Quickstart", link: "/docs/quickstart" },
    ],
  },
  {
    text: "Editor setup",
    collapsed: false,
    items: [
      { text: "Customizing the Editor", link: "/docs/editor" },
      { text: "Slash Menu", link: "/docs/slash-menu" },
      { text: "Formatting Toolbar", link: "/docs/formatting-toolbar" },
      { text: "Side Menu", link: "/docs/side-menu" },
    ],
  },
  {
    text: "Working with Blocks",
    collapsed: false,
    items: [
      { text: "Introduction to Blocks", link: "/docs/blocks" },
      { text: "Block Types & Properties", link: "/docs/block-types" },
      { text: "Manipulating Blocks", link: "/docs/manipulating-blocks" },
      { text: "Inline Content", link: "/docs/inline-content" },
      { text: "Cursor & Selections", link: "/docs/cursor-selections" },
      { text: "Markdown & HTML", link: "/docs/converting-blocks" },
    ],
  },

  // {
  //   text: "Guides",
  //   collapsible: true,
  //   collapsed: false,
  //   items: [
  //     { text: "Introduction", link: "/guides/introduction" },
  //     { text: "Quickstart", link: "/guides/quickstart" },
  //     {
  //       text: "Working with the File System",
  //       link: "/guides/working-with-the-file-system",
  //     },
  //     { text: "Running Processes", link: "/guides/running-processes" },
  //     { text: "Configuring Headers", link: "/guides/configuring-headers" },
  //     { text: "Troubleshooting", link: "/guides/troubleshooting" },
  //     { text: "Browser Support", link: "/guides/browser-support" },
  //     { text: "Browser Configuration", link: "/guides/browser-config" },
  //     {
  //       text: "Community Inspirations",
  //       link: "/guides/community-inspirations",
  //     },
  //   ],
  // },
  {
    text: "Advanced",
    collapsed: true,
    items: [
      {
        text: "Without React (vanilla JS)",
        link: "/docs/vanilla-js",
      },
      {
        text: "Real-time collaboration",
        link: "/docs/real-time-collaboration",
      },
    ],
  },

  // {
  //   text: "AI App Tutorial (n2h)",
  //   collapsed: true,
  //   items: [
  //     { text: "Introduction", link: "/guides/introduction" },
  //     { text: "Quickstart", link: "/guides/quickstart" },
  //     {
  //       text: "Working with the File System",
  //       link: "/guides/working-with-the-file-system",
  //     },
  //     { text: "Running Processes", link: "/guides/running-processes" },
  //     { text: "Configuring Headers", link: "/guides/configuring-headers" },
  //     { text: "Troubleshooting", link: "/guides/troubleshooting" },
  //     { text: "Browser Support", link: "/guides/browser-support" },
  //     { text: "Browser Configuration", link: "/guides/browser-config" },
  //     {
  //       text: "Community Inspirations",
  //       link: "/guides/community-inspirations",
  //     },
  //   ],
  // },

  {
    items: [
      // { text: "API Reference (n2h)", link: "/api" },
      {
        text: "Community",
        link: "https://discord.gg/Qc2QTTH5dF",
      },
    ],
  },
];

export default defineConfig({
  vite: {},
  appearance: false,
  srcDir: ".",
  outDir: "build",

  // Generate files as `/path/to/page.html` and URLs as `/path/to/page`
  cleanUrls: true,

  // Prevent builds when content has dead links
  ignoreDeadLinks: true,

  // Metadata
  lang: "en-US",
  title: "BlockNote",
  description: "TODO",
  head: getHeadTags(process.env),
  // See docs: https://vitepress.vuejs.org/guides/theme-nav

  // Theme
  themeConfig: {
    siteTitle: false,
    logo: {
      light: "/img/logos/banner.svg",
      dark: "/img/logos/banner.svg",
    },
    nav: [{ text: "Documentation", link: "/docs/introduction" }],
    sidebar: {
      "/docs/": SIDEBAR_DEFAULT,
      // "/tutorial/": SIDEBAR_DEFAULT,
      // "/api": SIDEBAR_DEFAULT,
    },
    // editLink: {
    //   pattern:
    //     "/docs/:path",
    //   text: "Edit this page",
    // },
    algolia: getAlgoliaConfig(process.env),
    socialLinks: [
      { icon: "github", link: "https://github.com/yousefed/blocknote" },
      // { icon: "twitter", link: "https://twitter.com/TypeCellOS" },
      {
        icon: "discord",
        link: "https://discord.gg/Qc2QTTH5dF",
      },
    ],
  },

  markdown: {
    config(md) {
      md
        // the second parameter is html tag name
        .use(container, "sandbox", {
          render(tokens, idx) {
            return renderSandbox(tokens, idx, "sandbox");
          },
        });
    },
  },
});

function getHeadTags(env: NodeJS.ProcessEnv): HeadConfig[] {
  const tags: HeadConfig[] = [
    [
      "link",
      { rel: "icon", type: "image/png", href: "/img/logos/icon_light_400.png" },
    ],
    [
      "link",
      { rel: "icon", type: "image/svg", href: "/img/logos/icon_light_400.svg" },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "BlockNote" }],
    // ["meta", { name: "twitter:card", content: "summary_large_image" }],
    // ["meta", { name: "twitter:title", content: "BlockNote Docs" }],
    // ["meta", { name: "twitter:site", content: "@TypeCellOS" }],
  ];

  if (env.VITE_GTM_ID) {
    tags.push([
      "script",
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${env.VITE_GTM_ID}`,
        async: "",
      },
    ]);
    tags.push([
      "script",
      {},
      `function gtag(){dataLayer.push(arguments)}window.dataLayer=window.dataLayer||[],gtag('js',new Date),gtag('config','${env.VITE_GTM_ID}',{anonymize_ip:true})`,
    ]);
  }

  return tags;
}

function getAlgoliaConfig(env: NodeJS.ProcessEnv) {
  if (env.VITE_ALGOLIA_ID && env.VITE_ALGOLIA_KEY) {
    return {
      indexName: "blocknote",
      appId: env.VITE_ALGOLIA_ID,
      apiKey: env.VITE_ALGOLIA_KEY,
    };
  }
}
