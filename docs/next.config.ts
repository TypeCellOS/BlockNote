import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";

const withMDX = createMDX();

const config = {
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash"],
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
      source: "/docs/editor-api/converting-blocks",
      destination: "/docs/features/interoperability",
      permanent: true,
    },
    {
      source: "/docs/ai/setup",
      destination: "/docs/features/ai/getting-started",
      permanent: true,
    },
    {
      source: "/docs/advanced/ariakit",
      destination: "/docs/getting-started/ariakit",
      permanent: true,
    },
    {
      source: "/docs/advanced/shadcn",
      destination: "/docs/getting-started/shadcn",
      permanent: true,
    },
    {
      source: "/docs/advanced/paste-handling",
      destination: "/docs/features/interoperability",
      permanent: true,
    },
    {
      source: "/docs/ui-components/formatting-toolbar",
      destination: "/docs/react/components/formatting-toolbar",
      permanent: true,
    },
    {
      source: "/docs/ui-components/suggestion-menus",
      destination: "/docs/react/components/suggestion-menus",
      permanent: true,
    },
    {
      source: "/docs/ui-components/side-menu",
      destination: "/docs/react/components/side-menu",
      permanent: true,
    },
    {
      source: "/docs/ui-components/link-toolbar",
      destination: "/docs/react/components/link-toolbar",
      permanent: true,
    },
    {
      source: "/docs/custom-schemas/custom-blocks",
      destination: "/docs/features/custom-schemas/custom-blocks",
      permanent: true,
    },
    {
      source: "/docs/custom-schemas/custom-inline-content",
      destination: "/docs/features/custom-schemas/custom-inline-content",
      permanent: true,
    },
    {
      source: "/docs/custom-schemas/custom-styles",
      destination: "/docs/features/custom-schemas/custom-styles",
      permanent: true,
    },
    {
      source: "/docs/custom-schemas",
      destination: "/docs/features/custom-schemas",
      permanent: true,
    },
    {
      source: "/docs/editor-basics/setup",
      destination: "/docs/getting-started/editor-setup",
      permanent: true,
    },
    {
      source: "/docs/editor-basics/document-structure",
      destination: "/docs/foundations/document-structure",
      permanent: true,
    },
    {
      source: "/docs/editor-basics/default-schema",
      destination: "/docs/foundations/schemas",
      permanent: true,
    },
    {
      source: "/docs/editor-api/manipulating-blocks",
      destination: "/docs/reference/editor/manipulating-content",
      permanent: true,
    },
    {
      source: "/docs/editor-api/manipulating-inline-content",
      destination: "/docs/reference/editor/manipulating-content",
      permanent: true,
    },
    {
      source: "/docs/editor-api/cursor-selections",
      destination: "/docs/reference/editor/cursor-selections",
      permanent: true,
    },
    {
      source: "/docs/advanced/code-blocks",
      destination: "/docs/features/blocks/code-blocks",
      permanent: true,
    },
    {
      source: "/docs/advanced/tables",
      destination: "/docs/features/blocks/tables",
      permanent: true,
    },
    {
      source: "/docs/ai/custom-commands",
      destination: "/docs/features/ai/custom-commands",
      permanent: true,
    },
    {
      source: "/docs/ai/getting-started",
      destination: "/docs/features/ai/getting-started",
      permanent: true,
    },
    {
      source: "/docs/ai/reference",
      destination: "/docs/features/ai/reference",
      permanent: true,
    },
    {
      source: "/docs/styling-theming/overriding-css",
      destination: "/docs/react/styling-theming/overriding-css",
      permanent: true,
    },
    {
      source: "/docs/styling-theming/themes",
      destination: "/docs/react/styling-theming/themes",
      permanent: true,
    },
    {
      source: "/docs/styling-theming/adding-dom-attributes",
      destination: "/docs/react/styling-theming/adding-dom-attributes",
      permanent: true,
    },
    {
      source: "/docs/collaboration/real-time-collaboration",
      destination: "/docs/features/collaboration",
      permanent: true,
    },
    {
      source: "/docs/collaboration/comments",
      destination: "/docs/features/collaboration/comments",
      permanent: true,
    },
    {
      source: "/docs/editor-api/server-processing",
      destination: "/docs/features/server-processing",
      permanent: true,
    },
    {
      source: "/docs/editor-api/converting-blocks",
      destination: "/docs/features/interoperability",
      permanent: true,
    },
    { source: "/docs/introduction", destination: "/docs", permanent: true },
    {
      source: "/docs/quickstart",
      destination: "/docs/install",
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
