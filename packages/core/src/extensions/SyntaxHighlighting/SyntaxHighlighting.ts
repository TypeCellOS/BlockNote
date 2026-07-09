import type { HighlighterGeneric } from "@shikijs/types";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { lazyShikiPlugin } from "./shiki.js";
import {
  CustomInlineContentConfig,
  InlineContentSpec,
  LooseBlockSpec,
} from "../../schema/index.js";

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
 * Collects the node type names that should be syntax-highlighted from a schema's
 * block and inline-content specs.
 *
 * A spec is a candidate when it has a `meta.highlight` callback (which decides
 * the language) AND the node actually holds editable text. Block and
 * inline-content specs use different `content` value spaces, so "editable text"
 * means `content === "inline"` for blocks and `content === "styled"` for inline
 * content - hence the two are filtered separately.
 *
 * Inline content (e.g. inline math) is highlighted too: `prosemirror-highlight`
 * collects nodes by `node.inlineContent` since v0.15.3
 * (https://github.com/ocavue/prosemirror-highlight/pull/137), so inline nodes
 * holding inline content are visited alongside text blocks.
 */
export function collectHighlightNodeTypes(schema: {
  blockSpecs: Record<string, unknown>;
  inlineContentSpecs: Record<string, unknown>;
}): string[] {
  const blockNodeTypes = Object.values(schema.blockSpecs)
    .filter(
      (blockSpec): blockSpec is LooseBlockSpec =>
        typeof (blockSpec as LooseBlockSpec)?.config === "object" &&
        (blockSpec as LooseBlockSpec).config.content === "inline" &&
        !!(blockSpec as LooseBlockSpec).implementation?.meta?.highlight,
    )
    .map((blockSpec) => blockSpec.config.type);

  const inlineContentNodeTypes = Object.values(schema.inlineContentSpecs)
    .filter(
      (
        inlineContentSpec,
      ): inlineContentSpec is InlineContentSpec<CustomInlineContentConfig> =>
        typeof (
          inlineContentSpec as InlineContentSpec<CustomInlineContentConfig>
        )?.config === "object" &&
        (inlineContentSpec as InlineContentSpec<CustomInlineContentConfig>)
          .config.content === "styled" &&
        !!(inlineContentSpec as InlineContentSpec<CustomInlineContentConfig>)
          .implementation?.meta?.highlight,
    )
    .map((inlineContentSpec) => inlineContentSpec.config.type);

  return [...blockNodeTypes, ...inlineContentNodeTypes];
}

/**
 * A single editor-wide extension that syntax-highlights block and inline-content
 * content. Which nodes get highlighted (and as which language) is decided by
 * each spec's `meta.highlight` callback, so individual specs declare their own
 * language rather than the extension configuring them.
 *
 * Highlighting is opt-in: the user adds this extension to the editor's
 * `extensions` (configured with a `createHighlighter`) to enable it. When it's
 * absent, content renders as plain text.
 */
export const SyntaxHighlightingExtension = createExtension(
  ({ editor, options }: ExtensionOptions<SyntaxHighlightingOptions>) => {
    const nodeTypes = collectHighlightNodeTypes(editor.schema);

    return {
      key: "syntaxHighlighting",
      prosemirrorPlugins: [lazyShikiPlugin(options, nodeTypes, editor.schema)],
    };
  },
);
