/** @type {import('next').NextConfig} */
import analyzer from "@next/bundle-analyzer";
import nextra from "nextra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  // options
  flexsearch: true,
  staticImage: true,
  defaultShowCopyCode: true,
});

const withAnalyzer = analyzer({ enabled: false });

const nextConfig = withAnalyzer(
  withNextra({
    // transpilePackages: ["@blocknote/example-react-custom-styles"],
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "avatars.githubusercontent.com",
          port: "",
          pathname: "/u/**",
        },
        {
          protocol: "https",
          hostname: "github.com",
          port: "",
          pathname: "/**",
        },
      ],
    },
    redirects: async () => [
      {
        source: "/docs/introduction",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/docs/editor",
        destination: "/docs/editor-basics/setup",
        permanent: true,
      },
      {
        source: "/docs/theming",
        destination: "/docs/styling-theming",
        permanent: true,
      },
      {
        source: "/docs/formatting-toolbar",
        destination: "/docs/ui-components/formatting-toolbar",
        permanent: true,
      },
      {
        source: "/docs/slash-menu",
        destination: "/docs/ui-components/suggestion-menus",
        permanent: true,
      },
      {
        source: "/docs/side-menu",
        destination: "/docs/ui-components/side-menu",
        permanent: true,
      },
      {
        source: "/docs/ui-elements",
        destination: "/docs/ui-components",
        permanent: true,
      },
      {
        source: "/docs/blocks",
        destination: "/docs/editor-basics/document-structure",
        permanent: true,
      },
      {
        source: "/docs/block-types",
        destination: "/docs/editor-basics/default-schema",
        permanent: true,
      },
      {
        source: "/docs/manipulating-blocks",
        destination: "/docs/editor-api/manipulating-blocks",
        permanent: true,
      },
      {
        source: "/docs/inline-content",
        destination: "/docs/editor-api/manipulating-inline-content",
        permanent: true,
      },
      {
        source: "/docs/cursor-selections",
        destination: "/docs/editor-api/cursor-selections",
        permanent: true,
      },
      {
        source: "/docs/converting-blocks",
        destination: "/docs/editor-api/converting-blocks",
        permanent: true,
      },
      {
        source: "/docs/real-time-collaboration",
        destination: "/docs/advanced/real-time-collaboration",
        permanent: true,
      },
      {
        source: "/docs/nextjs",
        destination: "/docs/advanced/nextjs",
        permanent: true,
      },
      {
        source: "/docs/vanilla-js",
        destination: "/docs/advanced/vanilla-js",
        permanent: true,
      },
      {
        source: "/examples/basic/all-blocks",
        destination: "/examples/basic/default-blocks",
        permanent: true,
      },
    ],
    experimental: {
      externalDir: true,
    },
    webpack: (config, { isServer }) => {
      config.externals.push({
        // "@blocknote/core": "bncore",
        // "@blocknote/react": "bnreact",
        // ...
      });

      if (config.mode === "development") {
        // makes sure the local blocknote dependencies get their own chunk, and are not included in every page bundle
        // in prod mode this should be handled ok by webpack (check with analyzer)
        config.optimization.splitChunks = {
          // chunks: "all",
          cacheGroups: {
            vendor: {
              test: (module) => {
                // console.log(module.resource);
                if (
                  module.resource?.includes("blocknote") ||
                  module.resource?.includes("mantine")
                ) {
                  return true;
                }
                return false;
              },
              name: "blocknotechunk",
              chunks: "all",
            },
          },
        };
      }

      const alias = config.resolve.alias;
      config.resolve.alias = {
        ...alias,
        // Comment out the lines below to load a built version of blocknote
        // or, keep as is to load live from sources with live reload working
        // "@blocknote/core": path.resolve(__dirname, "../packages/core/src/"),
        // "@blocknote/react": path.resolve(__dirname, "../packages/react/src/"),
      };
    },
  }),
);

export default nextConfig;
