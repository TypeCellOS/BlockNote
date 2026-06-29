import type { HighlighterGeneric } from "@shikijs/types";
import { Parser, createHighlightPlugin } from "prosemirror-highlight";
import { createParser } from "prosemirror-highlight/shiki";
import type { SyntaxHighlightingOptions } from "./SyntaxHighlighting.js";
import { CustomBlockNoteSchema } from "../../schema/schema.js";

export const shikiParserSymbol = Symbol.for("blocknote.shikiParser");
export const shikiHighlighterPromiseSymbol = Symbol.for(
  "blocknote.shikiHighlighterPromise",
);

// Languages that represent "no highlighting" - skipped without asking Shiki to
// load a grammar for them.
const PLAIN_TEXT_LANGUAGES = ["text", "none", "plaintext", "txt"];

/**
 * Creates the syntax highlighting plugin for the given block types, lazily
 * loading the highlighter on first use.
 *
 * `highlightBlock` resolves each block to a language, which is passed straight
 * to Shiki - it resolves aliases and loads the grammar from its bundle, so any
 * language the provided highlighter bundles can be highlighted.
 */
export function lazyShikiPlugin(
  options: SyntaxHighlightingOptions,
  nodeTypes: string[],
  schema: CustomBlockNoteSchema<any, any, any>,
) {
  const globalThisForShiki = globalThis as {
    [shikiHighlighterPromiseSymbol]?: Promise<HighlighterGeneric<any, any>>;
    [shikiParserSymbol]?: Parser;
  };

  let highlighter: HighlighterGeneric<any, any> | undefined;
  let parser: Parser | undefined;
  // Languages the highlighter failed to load (e.g. not in its bundle). Tracked
  // so we don't keep retrying - and re-triggering re-highlights - forever.
  const unsupportedLanguages = new Set<string>();
  const lazyParser: Parser = (parserOptions) => {
    if (!options.createHighlighter) {
      return [];
    }
    if (!highlighter) {
      globalThisForShiki[shikiHighlighterPromiseSymbol] =
        globalThisForShiki[shikiHighlighterPromiseSymbol] ||
        options.createHighlighter();

      return globalThisForShiki[shikiHighlighterPromiseSymbol].then(
        (createdHighlighter) => {
          highlighter = createdHighlighter;
        },
      );
    }
    const language = parserOptions.language;

    if (
      !language ||
      PLAIN_TEXT_LANGUAGES.includes(language) ||
      unsupportedLanguages.has(language)
    ) {
      return [];
    }

    if (!highlighter.getLoadedLanguages().includes(language)) {
      return highlighter.loadLanguage(language as any).catch(() => {
        // The highlighter doesn't bundle this language - give up on it so we
        // don't loop trying to load it on every re-highlight.
        unsupportedLanguages.add(language);
      });
    }

    if (!parser) {
      parser =
        globalThisForShiki[shikiParserSymbol] ||
        createParser(highlighter as any);
      globalThisForShiki[shikiParserSymbol] = parser;
    }

    return parser(parserOptions);
  };

  return createHighlightPlugin({
    parser: lazyParser,
    // The highlight plugin only gives us the block content node, so we can only
    // reconstruct the block's `type` and `props` (which is all `highlightBlock`
    // needs to pick a language).
    languageExtractor: (node) => {
      const nodeShape = {
        type: node.type.name,
        props: node.attrs,
      };
      // search for the node in the blockSpec or inlineContentSpecs
      const spec =
        schema.blockSpecs[nodeShape.type] ||
        schema.inlineContentSpecs[nodeShape.type];

      return spec?.implementation?.meta?.highlight?.(nodeShape) ?? undefined;
    },
    nodeTypes,
  });
}
