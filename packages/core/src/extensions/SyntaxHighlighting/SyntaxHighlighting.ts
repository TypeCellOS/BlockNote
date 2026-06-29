import type { HighlighterGeneric } from "@shikijs/types";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { lazyShikiPlugin } from "./shiki.js";
import { LooseBlockSpec } from "../../schema/index.js";

export type SyntaxHighlightingOptions = {
  /**
   * Creates the Shiki highlighter used for syntax highlighting. Can be
   * asynchronous, so the highlighter is only loaded once it's first needed.
   *
   * When omitted, content renders without syntax highlighting.
   */
  createHighlighter: () => Promise<HighlighterGeneric<any, any>>;
};

/**
 * A single editor-wide extension that syntax-highlights block content. Which
 * blocks get highlighted (and as which language) is decided by the
 * `highlightBlock` option, so individual blocks don't configure it themselves.
 *
 * Highlighting is opt-in: this extension is only instantiated when the
 * `syntaxHighlighting` option is configured (see `getDefaultExtensions`).
 */
export const SyntaxHighlightingExtension = createExtension(
  ({ editor, options }: ExtensionOptions<SyntaxHighlightingOptions>) => {
    // Every block with inline (text) content is a candidate; `highlightBlock`
    // decides per-block whether and how to highlight it.
    const nodeTypes = [
      ...Object.values(editor.schema.blockSpecs),
      ...Object.values(editor.schema.inlineContentSpecs),
    ]
      .filter(
        (blockSpec): blockSpec is LooseBlockSpec =>
          typeof blockSpec.config === "object" &&
          blockSpec.config.content === "inline" &&
          !!blockSpec.implementation?.meta?.highlight,
      )
      .map((blockSpec) => blockSpec.config.type);

    return {
      key: "syntaxHighlighting",
      prosemirrorPlugins: [lazyShikiPlugin(options, nodeTypes, editor.schema)],
    };
  },
);
