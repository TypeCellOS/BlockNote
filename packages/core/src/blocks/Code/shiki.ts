import type { HighlighterGeneric } from "@shikijs/types";
import { Parser, createHighlightPlugin } from "prosemirror-highlight";
import { createParser } from "prosemirror-highlight/shiki";
import { CodeBlockOptions, getLanguageId } from "./block.js";

export const shikiParserSymbol = Symbol.for("blocknote.shikiParser");
export const shikiHighlighterPromiseSymbol = Symbol.for(
  "blocknote.shikiHighlighterPromise",
);

export function lazyShikiPlugin(options: CodeBlockOptions) {
  const globalThisForShiki = globalThis as {
    [shikiHighlighterPromiseSymbol]?: Promise<HighlighterGeneric<any, any>>;
    [shikiParserSymbol]?: Parser;
  };

  let highlighter: HighlighterGeneric<any, any> | undefined;
  let parser: Parser | undefined;
  let hasWarned = false;
  const lazyParser: Parser = (parserOptions) => {
    if (!options.createHighlighter) {
      if (process.env.NODE_ENV === "development" && !hasWarned) {
        // eslint-disable-next-line no-console
        console.log(
          "For syntax highlighting of code blocks, you must provide a `createCodeBlockSpec({ createHighlighter: () => ... })` function",
        );
        hasWarned = true;
      }
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
    const language = getLanguageId(options, parserOptions.language!);

    if (
      !language ||
      language === "text" ||
      language === "none" ||
      language === "plaintext" ||
      language === "txt"
    ) {
      return [];
    }

    if (!highlighter.getLoadedLanguages().includes(language)) {
      return highlighter.loadLanguage(language);
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
    languageExtractor: (node) => node.attrs.language,
    nodeTypes: ["codeBlock"],
  });
}
