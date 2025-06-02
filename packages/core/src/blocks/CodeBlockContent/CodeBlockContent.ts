import type { HighlighterGeneric } from "@shikijs/types";
import { InputRule, isTextSelection } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { Parser, createHighlightPlugin } from "prosemirror-highlight";
import { createParser } from "prosemirror-highlight/shiki";
import { BlockNoteEditor } from "../../index.js";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";

export type CodeBlockOptions = {
  /**
   * Whether to indent lines with a tab when the user presses `Tab` in a code block.
   *
   * @default true
   */
  indentLineWithTab?: boolean;
  /**
   * The default language to use for code blocks.
   *
   * @default "text"
   */
  defaultLanguage?: string;
  /**
   * The languages that are supported in the editor.
   *
   * @example
   * {
   *   javascript: {
   *     name: "JavaScript",
   *     aliases: ["js"],
   *   },
   *   typescript: {
   *     name: "TypeScript",
   *     aliases: ["ts"],
   *   },
   * }
   */
  supportedLanguages: Record<
    string,
    {
      /**
       * The display name of the language.
       */
      name: string;
      /**
       * Aliases for this language.
       */
      aliases?: string[];
    }
  >;
  /**
   * The highlighter to use for code blocks.
   */
  createHighlighter?: () => Promise<HighlighterGeneric<any, any>>;
};

type CodeBlockConfigOptions = {
  editor: BlockNoteEditor<any, any, any>;
};

export const shikiParserSymbol = Symbol.for("blocknote.shikiParser");
export const shikiHighlighterPromiseSymbol = Symbol.for(
  "blocknote.shikiHighlighterPromise",
);
export const defaultCodeBlockPropSchema = {
  language: {
    default: "text",
  },
} satisfies PropSchema;

const CodeBlockContent = createStronglyTypedTiptapNode({
  name: "codeBlock",
  content: "inline*",
  group: "blockContent",
  marks: "insertion deletion modification",
  code: true,
  defining: true,
  addOptions() {
    return {
      defaultLanguage: "text",
      indentLineWithTab: true,
      supportedLanguages: {},
    };
  },
  addAttributes() {
    const options = this.options as CodeBlockConfigOptions;

    return {
      language: {
        default: options.editor.settings.codeBlock.defaultLanguage,
        parseHTML: (inputElement) => {
          let element = inputElement as HTMLElement | null;
          let language: string | null = null;

          if (
            element?.tagName === "DIV" &&
            element?.dataset.contentType === "codeBlock"
          ) {
            element = element.children[0] as HTMLElement | null;
          }

          if (element?.tagName === "PRE") {
            element = element?.children[0] as HTMLElement | null;
          }

          const dataLanguage = element?.getAttribute("data-language");

          if (dataLanguage) {
            language = dataLanguage.toLowerCase();
          } else {
            const classNames = [...(element?.className.split(" ") || [])];
            const languages = classNames
              .filter((className) => className.startsWith("language-"))
              .map((className) => className.replace("language-", ""));

            if (languages.length > 0) {
              language = languages[0].toLowerCase();
            }
          }

          if (!language) {
            return null;
          }

          return (
            getLanguageId(options.editor.settings.codeBlock, language) ??
            language
          );
        },
        renderHTML: (attributes) => {
          return attributes.language
            ? {
                class: `language-${attributes.language}`,
                "data-language": attributes.language,
              }
            : {};
        },
      },
    };
  },
  parseHTML() {
    return [
      // Parse from internal HTML.
      {
        tag: "div[data-content-type=" + this.name + "]",
        contentElement: ".bn-inline-content",
      },
      // Parse from external HTML.
      {
        tag: "pre",
        // contentElement: "code",
        preserveWhitespace: "full",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const pre = document.createElement("pre");
    const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
      this.name,
      "code",
      this.options.domAttributes?.blockContent || {},
      {
        ...(this.options.domAttributes?.inlineContent || {}),
        ...HTMLAttributes,
      },
    );

    dom.removeChild(contentDOM);
    dom.appendChild(pre);
    pre.appendChild(contentDOM);

    return {
      dom,
      contentDOM,
    };
  },
  addNodeView() {
    const options = this.options as CodeBlockConfigOptions;

    return ({ editor, node, getPos, HTMLAttributes }) => {
      const pre = document.createElement("pre");
      const select = document.createElement("select");
      const selectWrapper = document.createElement("div");
      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        "code",
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
        },
        this.options.domAttributes?.inlineContent || {},
      );
      const handleLanguageChange = (event: Event) => {
        const language = (event.target as HTMLSelectElement).value;

        editor.commands.command(({ tr }) => {
          tr.setNodeAttribute(getPos(), "language", language);

          return true;
        });
      };

      Object.entries(
        options.editor.settings.codeBlock.supportedLanguages,
      ).forEach(([id, { name }]) => {
        const option = document.createElement("option");

        option.value = id;
        option.text = name;
        select.appendChild(option);
      });

      selectWrapper.contentEditable = "false";
      select.value =
        node.attrs.language ||
        options.editor.settings.codeBlock.defaultLanguage;
      dom.removeChild(contentDOM);
      dom.appendChild(selectWrapper);
      dom.appendChild(pre);
      pre.appendChild(contentDOM);
      selectWrapper.appendChild(select);
      select.addEventListener("change", handleLanguageChange);

      return {
        dom,
        contentDOM,
        update: (newNode) => {
          if (newNode.type !== this.type) {
            return false;
          }

          return true;
        },
        destroy: () => {
          select.removeEventListener("change", handleLanguageChange);
        },
      };
    };
  },
  addProseMirrorPlugins() {
    const options = this.options as CodeBlockConfigOptions;
    const globalThisForShiki = globalThis as {
      [shikiHighlighterPromiseSymbol]?: Promise<HighlighterGeneric<any, any>>;
      [shikiParserSymbol]?: Parser;
    };

    let highlighter: HighlighterGeneric<any, any> | undefined;
    let parser: Parser | undefined;
    let hasWarned = false;
    const lazyParser: Parser = (parserOptions) => {
      if (!options.editor.settings.codeBlock.createHighlighter) {
        if (process.env.NODE_ENV === "development" && !hasWarned) {
          // eslint-disable-next-line no-console
          console.log(
            "For syntax highlighting of code blocks, you must provide a `codeBlock.createHighlighter` function",
          );
          hasWarned = true;
        }
        return [];
      }
      if (!highlighter) {
        globalThisForShiki[shikiHighlighterPromiseSymbol] =
          globalThisForShiki[shikiHighlighterPromiseSymbol] ||
          options.editor.settings.codeBlock.createHighlighter();

        return globalThisForShiki[shikiHighlighterPromiseSymbol].then(
          (createdHighlighter) => {
            highlighter = createdHighlighter;
          },
        );
      }
      const language = getLanguageId(
        options.editor.settings.codeBlock,
        parserOptions.language!,
      );

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

    const shikiLazyPlugin = createHighlightPlugin({
      parser: lazyParser,
      languageExtractor: (node) => node.attrs.language,
      nodeTypes: [this.name],
    });

    return [shikiLazyPlugin];
  },
  addInputRules() {
    const options = this.options as CodeBlockConfigOptions;

    return [
      new InputRule({
        find: /^```(.*?)\s$/,
        handler: ({ state, range, match }) => {
          const $start = state.doc.resolve(range.from);
          const languageName = match[1].trim();
          const attributes = {
            language:
              getLanguageId(options.editor.settings.codeBlock, languageName) ??
              languageName,
          };

          if (
            !$start
              .node(-1)
              .canReplaceWith(
                $start.index(-1),
                $start.indexAfter(-1),
                this.type,
              )
          ) {
            return null;
          }

          state.tr
            .delete(range.from, range.to)
            .setBlockType(range.from, range.from, this.type, attributes)
            .setSelection(TextSelection.create(state.tr.doc, range.from));

          return;
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        // When inside empty codeblock, on `DELETE` key press, delete the codeblock
        if (
          editor.isActive(this.name) &&
          !$from.parent.textContent &&
          isTextSelection(selection)
        ) {
          // Get the start position of the codeblock for node selection
          const from = $from.pos - $from.parentOffset - 2;

          editor.chain().setNodeSelection(from).deleteSelection().run();

          return true;
        }

        return false;
      },
      Tab: ({ editor }) => {
        if (!this.options.indentLineWithTab) {
          return false;
        }
        if (editor.isActive(this.name)) {
          editor.commands.insertContent("  ");
          return true;
        }

        return false;
      },
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;

        if (!editor.isActive(this.name)) {
          return false;
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const endsWithDoubleNewline = $from.parent.textContent.endsWith("\n\n");

        if (!isAtEnd || !endsWithDoubleNewline) {
          editor.commands.insertContent("\n");
          return true;
        }

        return editor
          .chain()
          .command(({ tr }) => {
            tr.delete($from.pos - 2, $from.pos);

            return true;
          })
          .exitCode()
          .run();
      },
      "Shift-Enter": ({ editor }) => {
        const { $from } = editor.state.selection;

        if (!editor.isActive(this.name)) {
          return false;
        }

        editor
          .chain()
          .insertContentAt(
            $from.pos - $from.parentOffset + $from.parent.nodeSize,
            {
              type: "paragraph",
            },
          )
          .run();

        return true;
      },
    };
  },
});

export const CodeBlock = createBlockSpecFromStronglyTypedTiptapNode(
  CodeBlockContent,
  defaultCodeBlockPropSchema,
);

function getLanguageId(
  options: CodeBlockOptions,
  languageName: string,
): string | undefined {
  return Object.entries(options.supportedLanguages).find(
    ([id, { aliases }]) => {
      return aliases?.includes(languageName) || id === languageName;
    },
  )?.[0];
}
