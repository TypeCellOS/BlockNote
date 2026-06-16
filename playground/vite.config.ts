import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import Inspect from "vite-plugin-inspect";

import tailwindcss from "@tailwindcss/vite";

import { defineConfig } from "vite-plus";

const devAliases: Record<string, string> = {
  "@blocknote/core": resolve(__dirname, "../packages/core/src"),
  "@blocknote/react": resolve(__dirname, "../packages/react/src"),
  "@blocknote/ariakit": resolve(__dirname, "../packages/ariakit/src"),
  "@blocknote/mantine": resolve(__dirname, "../packages/mantine/src"),
  "@blocknote/shadcn": resolve(__dirname, "../packages/shadcn/src"),
  "@blocknote/xl-ai": resolve(__dirname, "../packages/xl-ai/src"),
  "@blocknote/xl-docx-exporter": resolve(
    __dirname,
    "../packages/xl-docx-exporter/src",
  ),
  "@blocknote/xl-odt-exporter": resolve(
    __dirname,
    "../packages/xl-odt-exporter/src",
  ),
  "@blocknote/xl-pdf-exporter": resolve(
    __dirname,
    "../packages/xl-pdf-exporter/src",
  ),
  "@shared": resolve(__dirname, "../shared"),
  "@blocknote/xl-multi-column": resolve(
    __dirname,
    "../packages/xl-multi-column/src",
  ),
  "@blocknote/xl-email-exporter": resolve(
    __dirname,
    "../packages/xl-email-exporter/src",
  ),
  // "@liveblocks/react-blocknote": resolve(
  //   __dirname,
  //   "../../liveblocks/packages/liveblocks-react-blocknote/src/",
  // ),
  /*
    This can be used when developing against a local version of liveblocks:

    "@liveblocks/core": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-core/src/"),
    "@liveblocks/react": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react/src/"),
    "@liveblocks/react-tiptap": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react-tiptap/src/"),
    "@liveblocks/react-blocknote/styles.css": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react-blocknote/styles.css"),
    "@liveblocks/react-blocknote": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react-blocknote/src/"),
    "@liveblocks/react-ui/styles.css": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react-ui/styles.css"),
    "@liveblocks/react-ui": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-react-ui/src/"),
    "@liveblocks/client": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-client/src/"),
    "@liveblocks/yjs": path.resolve(__dirname, "../../liveblocks/packages/liveblocks-yjs/src/"),
    "@tiptap/suggestion": path.resolve(__dirname, "../node_modules/@tiptap/suggestion/"),
    "yjs": path.resolve(__dirname, "../node_modules/yjs/"),
  */
};

// https://vitejs.dev/config/
export default defineConfig(((conf: { command: string }) => ({
  run: {
    tasks: {
      build: {
        command: "tsc && vp build",
        input: [
          { auto: true },
          { pattern: "!**/*.tsbuildinfo", base: "workspace" },
        ],
      },
    },
  },
  plugins: [react(), webpackStats(), Inspect(), tailwindcss()],
  optimizeDeps: {
    // Exclude @blocknote/* source-aliased packages from pre-bundling so that
    // when Vite pre-bundles @liveblocks/react-blocknote, it treats
    // @blocknote/* imports as external rather than inlining a second copy
    // (which would duplicate Selection.jsonID registrations like
    // "multiple-node").
    exclude: [
      "@blocknote/core",
      "@blocknote/react",
      "@blocknote/ariakit",
      "@blocknote/mantine",
      "@blocknote/shadcn",
      "@blocknote/xl-ai",
      "@blocknote/xl-multi-column",
      "@blocknote/xl-docx-exporter",
      "@blocknote/xl-odt-exporter",
      "@blocknote/xl-pdf-exporter",
      "@blocknote/xl-email-exporter",
    ],
  },
  build: {
    sourcemap: true,
  },
  preview: {
    port: 3000,
    // Bind on all interfaces so the dockerized `test:updateSnaps` flow
    // can reach the host preview server via `host.docker.internal`.
    host: true,
    // Vite 5.1+ blocks unknown Host headers as a DNS-rebinding mitigation;
    // whitelist the Docker gateway hostname used by the e2e tests.
    allowedHosts: ["host.docker.internal"],
  },
  resolve: {
    alias: conf.command === "build" ? undefined : devAliases,
  },
})) as Parameters<typeof defineConfig>[0]);
