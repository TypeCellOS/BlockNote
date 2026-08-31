import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";
import { redirects } from "./redirects";

const withMDX = createMDX();

const config = {
  // output: "export",
  reactStrictMode: true,
  // Next.js 16 blocks cross-origin requests to dev resources (`/_next/*`, HMR)
  // by default. When testing on a device on the local network - e.g. a phone
  // checking the mobile toolbar - the browser's origin is the machine's LAN IP,
  // not `localhost`, so those requests get a 403 and the page breaks. Allow the
  // common private LAN ranges so network devices can load the dev server. This
  // only affects `next dev`.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  serverExternalPackages: ["typescript", "twoslash"],
  reactCompiler: true,
  // TypeScript 7 ships only the native `tsc` binary; it no longer exposes the
  // JS compiler API that Next's in-process type check uses. Shell out to the
  // CLI instead.
  experimental: {
    useTypeScriptCli: true,
  },
  redirects,
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

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // TODO: why was this disabled?
    reactComponentAnnotation: {
      enabled: false,
    },
    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },

  telemetry: false,
});
