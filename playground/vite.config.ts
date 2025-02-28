import react from "@vitejs/plugin-react";
import auto from "autoprefixer";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import tailwindcss from "tailwindcss";
import nesting from "tailwindcss/nesting";

import { defineConfig } from "vite";
// import eslintPlugin from "vite-plugin-eslint";
// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  plugins: [react(), webpackStats()] as any,
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
        ? {}
        : {
            // Comment out the lines below to load a built version of blocknote
            // or, keep as is to load live from sources with live reload working
            "@blocknote/core": path.resolve(__dirname, "../packages/core/src/"),
            "@blocknote/react": path.resolve(
              __dirname,
              "../packages/react/src/"
            ),
            "@blocknote/ariakit": path.resolve(
              __dirname,
              "../packages/ariakit/src/"
            ),
            "@blocknote/mantine": path.resolve(
              __dirname,
              "../packages/mantine/src/"
            ),
            "@blocknote/shadcn": path.resolve(
              __dirname,
              "../packages/shadcn/src/"
            ),
            "@blocknote/xl-docx-exporter": path.resolve(
              __dirname,
              "../packages/xl-docx-exporter/src/"
            ),
            "@blocknote/xl-pdf-exporter": path.resolve(
              __dirname,
              "../packages/xl-pdf-exporter/src/"
            ),
            "@shared": path.resolve(__dirname, "../shared/"),
            "@blocknote/xl-multi-column": path.resolve(
              __dirname,
              "../packages/xl-multi-column/src/"
            ),
            /*
            This can be used when developing against a local version of liveblocks:
            
            "@liveblocks/core": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-core/src/"
            ),
            "@liveblocks/react": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react/src/"
            ),
            "@liveblocks/react-tiptap": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-tiptap/src/"
            ),
            "@liveblocks/react-blocknote/styles.css": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-blocknote/styles.css"
            ),
            "@liveblocks/react-blocknote": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-blocknote/src/"
            ),
            "@liveblocks/react-ui/styles.css": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-ui/styles.css"
            ),
            "@liveblocks/react-ui": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-react-ui/src/"
            ),

            "@liveblocks/client": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-client/src/"
            ),
            "@liveblocks/yjs": path.resolve(
              __dirname,
              "../../liveblocks/packages/liveblocks-yjs/src/"
            ),
            "@tiptap/suggestion": path.resolve(
              __dirname,
              "../node_modules/@tiptap/suggestion/"
            ),
            yjs: path.resolve(__dirname, "../node_modules/yjs/"),*/
          },
  },
}));
