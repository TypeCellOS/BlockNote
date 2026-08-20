import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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
      "@myriaddreamin/typst-ts-web-compiler/wasm":
        "./components/typstCompilerWasmUrl.ts",
      "@myriaddreamin/typst-ts-web-compiler/wasm?url":
        "./components/typstCompilerWasmUrl.ts",
    },
  },
  webpack: (webpackConfig) => {
    // The generated example demos are written for Vite, where `?url` asset
    // imports (fonts, the Typst compiler wasm) resolve to a URL string. Give
    // webpack the same semantics so those demos compile here too.
    webpackConfig.module.rules.push({
      resourceQuery: /^\?url$/,
      type: "asset/resource",
    });
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      // The Typst compiler package's canvas-renderer entry dynamically
      // imports this optional peer; the pdf-ua demo only compiles (never
      // renders to canvas), so it isn't installed - stub it out rather than
      // letting webpack's static resolution fail the build.
      "@myriaddreamin/typst-ts-renderer": false,
      // Resolve the compiler's `./wasm` exports subpath to the file
      // directly - webpack fails to resolve the subpath from the demo tree.
      "@myriaddreamin/typst-ts-web-compiler/wasm":
        require.resolve("@myriaddreamin/typst-ts-web-compiler/wasm"),
    };
    return webpackConfig;
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
