import babel from "@rollup/plugin-babel";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";
// import eslintPlugin from "vite-plugin-eslint";
// https://vitejs.dev/config/
import * as fs from "fs";
const LEXICAL_ROOT = "../../lexical-submodule/lexical/packages/";
const moduleResolution = [
  {
    find: /^lexical$/,
    replacement: path.resolve(LEXICAL_ROOT + "lexical/src/index.ts"),
  },
  {
    find: "@lexical/clipboard",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-clipboard/src/index.ts"),
  },
  {
    find: "@lexical/selection",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-selection/src/index.ts"),
  },
  {
    find: "@lexical/text",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-text/src/index.ts"),
  },
  {
    find: "@lexical/headless",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-headless/src/index.ts"),
  },
  {
    find: "@lexical/html",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-html/src/index.ts"),
  },
  {
    find: "@lexical/hashtag",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-hashtag/src/index.ts"),
  },
  {
    find: "@lexical/history",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-history/src/index.ts"),
  },
  {
    find: "@lexical/list",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-list/src/index.ts"),
  },
  {
    find: "@lexical/file",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-file/src/index.ts"),
  },
  {
    find: "@lexical/table",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-table/src/index.ts"),
  },
  {
    find: "@lexical/offset",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-offset/src/index.ts"),
  },
  {
    find: "@lexical/utils",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-utils/src/index.ts"),
  },
  {
    find: "@lexical/code",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-code/src/index.ts"),
  },
  {
    find: "@lexical/plain-text",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-plain-text/src/index.ts"),
  },
  {
    find: "@lexical/rich-text",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-rich-text/src/index.ts"),
  },
  {
    find: "@lexical/dragon",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-dragon/src/index.ts"),
  },
  {
    find: "@lexical/link",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-link/src/index.ts"),
  },
  {
    find: "@lexical/overflow",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-overflow/src/index.ts"),
  },
  {
    find: "@lexical/markdown",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-markdown/src/index.ts"),
  },
  {
    find: "@lexical/mark",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-mark/src/index.ts"),
  },
  {
    find: "@lexical/yjs",
    replacement: path.resolve(LEXICAL_ROOT + "lexical-yjs/src/index.ts"),
  },
  {
    find: "shared",
    replacement: path.resolve(LEXICAL_ROOT + "shared/src"),
  },
];
// Lexical React
[
  "LexicalTreeView",
  "LexicalComposer",
  "LexicalComposerContext",
  "useLexicalIsTextContentEmpty",
  "useLexicalTextEntity",
  "LexicalContentEditable",
  "LexicalNestedComposer",
  "LexicalHorizontalRuleNode",
  "LexicalDecoratorBlockNode",
  "LexicalBlockWithAlignableContents",
  "useLexicalNodeSelection",
  "LexicalMarkdownShortcutPlugin",
  "LexicalCharacterLimitPlugin",
  "LexicalHashtagPlugin",
  "LexicalPlainTextPlugin",
  "LexicalRichTextPlugin",
  "LexicalClearEditorPlugin",
  "LexicalCollaborationContext",
  "LexicalCollaborationPlugin",
  "LexicalHistoryPlugin",
  "LexicalTypeaheadMenuPlugin",
  "LexicalTablePlugin",
  "LexicalLinkPlugin",
  "LexicalListPlugin",
  "LexicalCheckListPlugin",
  "LexicalAutoFocusPlugin",
  "LexicalTableOfContents__EXPERIMENTAL",
  "LexicalAutoLinkPlugin",
  "LexicalAutoEmbedPlugin",
  "LexicalOnChangePlugin",
  "LexicalAutoScrollPlugin",
].forEach((module) => {
  let resolvedPath = path.resolve(
    LEXICAL_ROOT + `lexical-react/src/${module}.ts`
  );

  if (fs.existsSync(resolvedPath)) {
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  } else {
    resolvedPath = path.resolve(
      LEXICAL_ROOT + `lexical-react/src/${module}.tsx`
    );
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  }
});

export default defineConfig((conf) => ({
  plugins: [
    react(),
    // babel is only needed when we include Lexical from a local path
    babel({
      babelHelpers: "bundled",
      babelrc: false,
      configFile: false,
      exclude: ["/**node_modules/**"],
      extensions: ["jsx", "js", "ts", "tsx", "mjs"],
      plugins: [
        // '@babel/plugin-transform-flow-strip-types',
        [
          require(LEXICAL_ROOT +
            "../scripts/error-codes/transform-error-messages"),
          {
            noMinify: true,
          },
        ],
      ],
      presets: ["@babel/preset-react"],
    }),
  ],
  define: {
    __DEV__: true,
  },
  resolve: {
    alias:
      conf.command === "build"
        ? []
        : [
            ...moduleResolution,
            {
              // Comment out the line below to load a built version of blocknote
              // or, keep as is to load live from sources with live reload working
              find: "@blocknote/core-lexical",
              replacement: path.resolve(
                __dirname,
                "../../packages/core-lexical/src/"
              ),
            },
          ],
  },
}));
