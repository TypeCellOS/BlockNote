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
 * blocks get highlighted (and as which language) is decided by each spec's
 * `meta.highlight` callback, so individual blocks declare their own language
 * rather than the extension configuring them.
 *
 * Highlighting is opt-in: the user adds this extension to the editor's
 * `extensions` (configured with a `createHighlighter`) to enable it. When it's
 * absent, blocks render as plain text.
 */
export const SyntaxHighlightingExtension = createExtension(
  ({ editor, options }: ExtensionOptions<SyntaxHighlightingOptions>) => {
    // Every block/inline-content spec with a `meta.highlight` callback is a
    // candidate; that callback decides the language to highlight it as.
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
