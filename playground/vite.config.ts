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
  "@blocknote/math-block": resolve(__dirname, "../packages/math-block/src"),
  "@blocknote/diagram-block": resolve(
    __dirname,
    "../packages/diagram-block/src",
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
        command: "tsgo && vp build",
        input: [
          { auto: true },
          { pattern: "!**/*.tsbuildinfo", base: "workspace" },
        ],
        output: ["dist/**"],
      },
    },
  },
  plugins: [
    react(),
    // The stats are only consumed by RelativeCI, which uploads them from the
    // GitHub Actions build. Serializing the (huge) module graph at the end of
    // the build costs a lot of memory, which the Vercel build container can't
    // spare - it fails spawning processes (EAGAIN) right at that point.
    ...(process.env.VERCEL ? [] : [webpackStats()]),
    Inspect(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // link: ['vite-react-ts-components'],
  },
  build: {
    // Skipped on Vercel for the same reason as `webpackStats` above: emitting
    // a map for each of the ~340 chunks doubles the file writes and memory of
    // the largest build in the workspace, which is where the container dies.
    sourcemap: !process.env.VERCEL,
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
    alias:
      conf.command === "build"
        ? {
            // TODO: review
            // The exporters' optional peer dependencies, used by their
            // subpath entries (`…/diagram-block`, `…/math-block`). They
            // can't be resolved from the workspace-linked exporter packages
            // when those packages' devDependencies aren't installed (e.g.
            // Vercel's filtered install), making Vite substitute an empty
            // `__vite-optional-peer-dep` stub that fails the build - so
            // resolve them from the playground's own dependencies instead.
            "@blocknote/diagram-block": resolve(
              __dirname,
              "../packages/diagram-block",
            ),
            "@react-pdf/math": resolve(
              __dirname,
              "node_modules/@react-pdf/math",
            ),
            katex: resolve(__dirname, "node_modules/katex"),
          }
        : devAliases,
  },
})) as Parameters<typeof defineConfig>[0]);
