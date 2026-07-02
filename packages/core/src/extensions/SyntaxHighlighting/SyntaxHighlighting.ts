import type { HighlighterGeneric } from "@shikijs/types";
import type { Block } from "../../blocks/defaultBlocks.js";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { lazyShikiPlugin } from "./shiki.js";

export type SyntaxHighlightingOptions = {
  /**
   * Creates the Shiki highlighter used for syntax highlighting. Can be
   * asynchronous, so the highlighter is only loaded once it's first needed.
   *
   * When omitted, content renders without syntax highlighting.
   */
  createHighlighter?: () => Promise<HighlighterGeneric<any, any>>;
  /**
   * Picks the language to highlight a block's content as - return the language
   * key, or `undefined` to leave the block un-highlighted. This is where you
   * enable highlighting for specific blocks.
   *
   * Defaults to the block's `language` prop (`(block) => block.props.language`),
   * which covers the code block. Provide a custom function for blocks with a
   * fixed language, e.g. for the math block:
   * `(block) => (block.type === "math" ? "latex" : block.props.language)`.
   */
  highlightBlock?: (block: Block<any, any, any>) => string | undefined;
};

/** Highlights a block as its `language` prop (covers the code block). */
export const defaultHighlightBlock = (block: Block<any, any, any>) =>
  block.props.language as string | undefined;

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
    const highlightBlock = options.highlightBlock ?? defaultHighlightBlock;

    // Every block with inline (text) content is a candidate; `highlightBlock`
    // decides per-block whether and how to highlight it.
    const nodeTypes = Object.values(editor.schema.blockSpecs)
      .filter((blockSpec) => blockSpec.config.content === "inline")
      .map((blockSpec) => blockSpec.config.type);

    return {
      key: "syntaxHighlighting",
      prosemirrorPlugins: [lazyShikiPlugin(options, nodeTypes, highlightBlock)],
    };
  },
);
