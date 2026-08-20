import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";
import { redirects } from "./redirects";

const withMDX = createMDX();

const config = {
  // output: "export",
  reactStrictMode: true,
  serverExternalPackages: ["typescript", "twoslash"],
  reactCompiler: true,
  // TypeScript 7 ships only the native `tsc` binary; it no longer exposes the
  // JS compiler API that Next's in-process type check uses. Shell out to the
  // CLI instead.
  experimental: {
    useTypeScriptCli: true,
  },
  redirects,
  // `next build` runs Turbopack; the demo examples are written for Vite, so
  // give their `?url` asset imports (fonts, the Typst compiler wasm) the
  // same URL-string semantics here, and stub the compiler's optional
  // canvas-renderer peer (the pdf-ua demo only compiles, never renders to
  // canvas, so the peer isn't installed).
  turbopack: {
    resolveAlias: {
      "@myriaddreamin/typst-ts-renderer": "./components/typstRendererStub.ts",
      // Both key forms on purpose: Turbopack matches the alias key against
      // the request with its query in some resolution paths and without it
      // in others, so covering `/wasm` and `/wasm?url` makes the demo's
      // `?url` import resolve in both.
      "@myriaddreamin/typst-ts-web-compiler/wasm":
        "./components/typstCompilerWasmUrl.ts",
      "@myriaddreamin/typst-ts-web-compiler/wasm?url":
        "./components/typstCompilerWasmUrl.ts",
    },
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
