import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";

const withMDX = createMDX();

const config = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    reactCompiler: true,
  },
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
    {
      source: "/docs/advanced/real-time-collaboration",
      destination: "/docs/collaboration",
      permanent: true,
    },
  ],
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".mdx"],
  },
} satisfies NextConfig;

export default withSentryConfig(withMDX(config), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "blocknote-js",
  project: "website",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: false,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
  telemetry: false,
});
