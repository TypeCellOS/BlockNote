/** @type {import('next').NextConfig} */
import nextra from "nextra";
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
});

export default nextConfig;
