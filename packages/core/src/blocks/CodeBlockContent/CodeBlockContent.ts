import { InputRule, isTextSelection } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { createHighlightPlugin, Parser } from "prosemirror-highlight";
import { createParser } from "prosemirror-highlight/shiki";
import {
  BundledLanguage,
  bundledLanguagesInfo,
  createHighlighter,
  Highlighter,
} from "shiki";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
  PropSchema,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import {
  defaultSupportedLanguages,
  SupportedLanguageConfig,
} from "./defaultSupportedLanguages.js";

interface CodeBlockOptions {
  defaultLanguage: string;
  indentLineWithTab: boolean;
  supportedLanguages: SupportedLanguageConfig[];
}

export const shikiParserSymbol = Symbol.for("blocknote.shikiParser");
export const shikiHighlighterPromiseSymbol = Symbol.for(
  "blocknote.shikiHighlighterPromise"
);
export const defaultCodeBlockPropSchema = {
  language: {
    default: "javascript",
    values: [...defaultSupportedLanguages.map((lang) => lang.id)],
  },
} satisfies PropSchema;

const CodeBlockContent = createStronglyTypedTiptapNode({
  name: "codeBlock",
  content: "inline*",
  group: "blockContent",
  marks: "",
  code: true,
  defining: true,
  addOptions() {
    return {
      defaultLanguage: "javascript",
      indentLineWithTab: true,
      supportedLanguages: defaultSupportedLanguages,
    };
  },
  addAttributes() {
    const supportedLanguages = this.options
      .supportedLanguages as SupportedLanguageConfig[];

    return {
      language: {
        default: this.options.defaultLanguage,
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
            supportedLanguages.find(({ match }) => {
              return match.includes(language);
            })?.id || this.options.defaultLanguage
          );
        },
        renderHTML: (attributes) => {
          // TODO: Use `data-language="..."` instead for easier parsing
          return attributes.language && attributes.language !== "text"
            ? {
                class: `language-${attributes.language}`,
              }
            : {};
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]",
        contentElement: "code",
      },
      {
        tag: "pre",
        contentElement: "code",
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
      }
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
    const supportedLanguages = this.options
      .supportedLanguages as SupportedLanguageConfig[];

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
        this.options.domAttributes?.inlineContent || {}
      );
      const handleLanguageChange = (event: Event) => {
        const language = (event.target as HTMLSelectElement).value;

        editor.commands.command(({ tr }) => {
          tr.setNodeAttribute(getPos(), "language", language);

          return true;
        });
      };

      supportedLanguages.forEach(({ id, name }) => {
        const option = document.createElement("option");

        option.value = id;
        option.text = name;
        select.appendChild(option);
      });

      selectWrapper.contentEditable = "false";
      select.value = node.attrs.language || this.options.defaultLanguage;
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
    const supportedLanguages = this.options
      .supportedLanguages as SupportedLanguageConfig[];
    const globalThisForShiki = globalThis as {
      [shikiHighlighterPromiseSymbol]?: Promise<Highlighter>;
      [shikiParserSymbol]?: Parser;
    };

    let highlighter: Highlighter | undefined;
    let parser: Parser | undefined;

    const lazyParser: Parser = (options) => {
      if (!highlighter) {
        globalThisForShiki[shikiHighlighterPromiseSymbol] =
          globalThisForShiki[shikiHighlighterPromiseSymbol] ||
          createHighlighter({
            themes: ["github-dark"],
            langs: [],
          });

        return globalThisForShiki[shikiHighlighterPromiseSymbol].then(
          (createdHighlighter) => {
            highlighter = createdHighlighter;
          }
        );
      }

      const language = options.language;

      if (
        language &&
        language !== "text" &&
        !highlighter.getLoadedLanguages().includes(language) &&
        supportedLanguages.find(({ id }) => id === language) &&
        bundledLanguagesInfo.find(({ id }) => id === language)
      ) {
        return highlighter.loadLanguage(language as BundledLanguage);
      }

      if (!parser) {
        parser =
          globalThisForShiki[shikiParserSymbol] || createParser(highlighter);
        globalThisForShiki[shikiParserSymbol] = parser;
      }

      return parser(options);
    };

    const shikiLazyPlugin = createHighlightPlugin({
      parser: lazyParser,
      languageExtractor: (node) => node.attrs.language,
      nodeTypes: [this.name],
    });

    return [shikiLazyPlugin];
  },
  addInputRules() {
    const supportedLanguages = this.options
      .supportedLanguages as SupportedLanguageConfig[];

    return [
      new InputRule({
        find: /^```(.*?)\s$/,
        handler: ({ state, range, match }) => {
          const $start = state.doc.resolve(range.from);
          const languageName = match[1].trim();
          const attributes = {
            language:
              supportedLanguages.find(({ match }) => {
                return match.includes(languageName);
              })?.id || this.options.defaultLanguage,
          };

          if (
            !$start
              .node(-1)
              .canReplaceWith(
                $start.index(-1),
                $start.indexAfter(-1),
                this.type
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
            }
          )
          .run();

        return true;
      },
    };
  },
});

export const CodeBlock = createBlockSpecFromStronglyTypedTiptapNode(
  CodeBlockContent,
  defaultCodeBlockPropSchema
);

export function customizeCodeBlock(options: Partial<CodeBlockOptions>) {
  return createBlockSpecFromStronglyTypedTiptapNode(
    CodeBlockContent.configure(options),
    {
      language: {
        default:
          options.defaultLanguage ||
          defaultCodeBlockPropSchema.language.default,
        values:
          options.supportedLanguages?.map((lang) => lang.id) ||
          defaultCodeBlockPropSchema.language.values,
      },
    }
  );
}
