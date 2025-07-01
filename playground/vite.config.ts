import react from "@vitejs/plugin-react";
import auto from "autoprefixer";
import { resolve } from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import Inspect from "vite-plugin-inspect";

import tailwindcss from "tailwindcss";
import nesting from "tailwindcss/nesting";

import { defineConfig } from "vite";
// import eslintPlugin from "vite-plugin-eslint";
// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  plugins: [react(), webpackStats(), Inspect()],
  optimizeDeps: {
    // link: ['vite-react-ts-components'],
  },
  build: {
    sourcemap: true,
  },
  css: {
    postcss: {
      plugins: [
        nesting,
        tailwindcss("../packages/shadcn/tailwind.config.js"), // Adjust the path as necessary
        auto,
      ],
    },
    // postcss: "../packages/shadcn/postcss.config.js",
  },
  resolve: {
    alias:
      conf.command === "build"
        ? undefined
        : {
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
            "@liveblocks/react-blocknote": resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-blocknote/src/",
            ),
            "@blocknote/xl-email-exporter": resolve(
              __dirname,
              "../packages/xl-email-exporter/src",
            ),
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
          },
  },
}));
