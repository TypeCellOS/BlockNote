/** @type {import('next').NextConfig} */
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

const nextConfig = withNextra({
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      // "@blocknote/core": "bncore",
      // "@blocknote/react": "bnreact",
      // ...
    });
    const alias = config.resolve.alias;
    config.resolve.alias = {
      ...alias,
      // Comment out the lines below to load a built version of blocknote
      // or, keep as is to load live from sources with live reload working
      // "@blocknote/core": path.resolve(__dirname, "../packages/core/src/"),
      // "@blocknote/react": path.resolve(__dirname, "../packages/react/src/"),
    };
  },
});

export default nextConfig;
