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
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'avatars.githubusercontent.com',
          port: '',
          pathname: '/u/**',
        },
        {
          protocol: 'https',
          hostname: 'github.com',
          port: '',
          pathname: '/**',
        },
      ],
    },
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
                if (module.resource?.includes("blocknote") || module.resource?.includes("mantine")) {

                  return true;
                }
                return false;
              },
              name: 'blocknotechunk',
              chunks: 'all',
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
  })
);

export default nextConfig;
