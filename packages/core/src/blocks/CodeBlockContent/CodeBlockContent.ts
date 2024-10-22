import { InputRule, isTextSelection } from "@tiptap/core";
import {
  BuiltinLanguage,
  bundledLanguagesInfo,
  createHighlighter,
  Highlighter,
} from "shiki";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { createHighlightPlugin, Parser } from "prosemirror-highlight";
import { createParser } from "prosemirror-highlight/shiki";
import { TextSelection } from "@tiptap/pm/state";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";

type SupportedLanguageConfig = {
  id: string;
  name: string;
  match: string[];
};

export const codeBlockPropSchema = {
  ...defaultProps,
  language: {
    default: "",
    values: [...bundledLanguagesInfo.map((lang) => lang.id), ""],
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
      indentLineWithTab: true,
      supportedLanguages: [
        {
          match: [""],
          id: "",
          name: "Code",
        },
        ...bundledLanguagesInfo.map((lang) => ({
          match: [lang.id, ...(lang.aliases || [])],
          id: lang.id,
          name: lang.name,
        })),
      ],
    };
  },
  addAttributes() {
    return {
      language: {
        default: "",
        parseHTML: (inputElement) => {
          let element = inputElement as HTMLElement | null;

          if (
            element?.tagName === "DIV" &&
            element?.dataset.contentType === "codeBlock"
          ) {
            element = element.children[0] as HTMLElement | null;
          }
          if (element?.tagName === "PRE") {
            element = element?.children[0] as HTMLElement | null;
          }

          const classNames = [...(element?.className.split(" ") || [])];
          const languages = classNames
            .filter((className) => className.startsWith("language-"))
            .map((className) => className.replace("language-", ""));
          const [language] = languages;

          if (!language) {
            return null;
          }

          return language.toLowerCase();
        },
        renderHTML: (attributes) => {
          return attributes.language
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
      },
      {
        tag: "pre",
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
      select.value = node.attrs.language || "";
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
    let highlighter: Highlighter | undefined;
    let parser: Parser | undefined;

    const supportedLanguages = this.options
      .supportedLanguages as SupportedLanguageConfig[];
    const lazyParser: Parser = (options) => {
      if (!highlighter) {
        return createHighlighter({
          themes: ["github-dark"],
          langs: [],
        }).then((createdHighlighter) => {
          highlighter = createdHighlighter;
        });
      }

      const language = options.language as BuiltinLanguage;

      if (
        language &&
        !highlighter.getLoadedLanguages().includes(language) &&
        supportedLanguages.find(({ id }) => id === language)
      ) {
        return highlighter.loadLanguage(language);
      }

      if (!parser) {
        parser = createParser(highlighter);
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
              })?.id || "",
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

        if (
          editor.isActive(this.name) &&
          !$from.parent.textContent &&
          isTextSelection(selection)
        ) {
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
  codeBlockPropSchema
);
export function customizeCodeBlock(options: {
  indentLineWithTab?: boolean;
  supportedLanguages?: SupportedLanguageConfig[];
}) {
  return createBlockSpecFromStronglyTypedTiptapNode(
    CodeBlockContent.configure(options),
    codeBlockPropSchema
  );
}
