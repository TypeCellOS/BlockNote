import type { HighlighterGeneric } from "@shikijs/types";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import type { BlockFromConfig } from "../../schema/index.js";
import { createRenderPreviewWithSourcePopup } from "./renderPreviewWithSourcePopup.js";
import { createRenderSource } from "./renderSource.js";
import { lazyShikiPlugin } from "./shiki.js";
import { DOMParser } from "@tiptap/pm/model";

/**
 * Renders a preview of a code block's content (e.g. rendered LaTeX). Takes the
 * same parameters as a block's `render` function and returns the same type,
 * minus `contentDOM` - as a preview never holds the block's editable content.
 *
 * A `renderPreview` function is only responsible for the preview itself. It has
 * no opinion on when, where, or how the preview is displayed - that's up to the
 * code block's `render` function.
 */
export type CodeBlockRenderPreview = (
  block: BlockFromConfig<CodeBlockConfig, any, any>,
  editor: BlockNoteEditor<any>,
) => {
  dom: HTMLElement;
  ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
  destroy?: () => void;
};

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
  supportedLanguages?: Record<
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
      /**
       * Renders a preview of the result of the code (e.g. rendered LaTeX). When
       * defined, the code block displays this preview instead of the raw source
       * by default, and shows the editable source in a popup when selected.
       */
      renderPreview?: CodeBlockRenderPreview;
    }
  >;
  /**
   * The highlighter to use for code blocks.
   */
  createHighlighter?: () => Promise<HighlighterGeneric<any, any>>;
};

export type CodeBlockConfig = ReturnType<typeof createCodeBlockConfig>;

export const createCodeBlockConfig = createBlockConfig(
  ({ defaultLanguage = "text" }: CodeBlockOptions) =>
    ({
      type: "codeBlock" as const,
      propSchema: {
        language: {
          default: defaultLanguage,
        },
      },
      content: "inline",
    }) as const,
);

export const createCodeBlockSpec = createBlockSpec(
  createCodeBlockConfig,
  (options) => {
    const renderSource = createRenderSource(options);
    const renderPreviewWithSourcePopup =
      createRenderPreviewWithSourcePopup(options);

    return {
      meta: {
        code: true,
        defining: true,
        isolating: false,
      },
      parse: (e) => {
        if (e.tagName !== "PRE") {
          return undefined;
        }

        if (
          e.childElementCount !== 1 ||
          e.firstElementChild?.tagName !== "CODE"
        ) {
          return undefined;
        }

        const code = e.firstElementChild!;
        const language =
          code.getAttribute("data-language") ||
          code.className
            .split(" ")
            .find((name) => name.includes("language-"))
            ?.replace("language-", "");

        return { language };
      },

      parseContent: ({ el, schema }) => {
        const parser = DOMParser.fromSchema(schema);
        const code = el.firstElementChild!;

        return parser.parse(code, {
          preserveWhitespace: "full",
          topNode: schema.nodes["codeBlock"].create(),
        }).content;
      },

      render(block, editor) {
        const language =
          block.props.language || options.defaultLanguage || "text";
        const renderPreview =
          options.supportedLanguages?.[language]?.renderPreview;

        // Languages with a preview show the rendered result by default, with the
        // editable source in a popup when selected. Other languages just show the
        // source.
        return renderPreview
          ? renderPreviewWithSourcePopup(block, editor, renderPreview)
          : renderSource(block, editor);
      },
      toExternalHTML(block) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.className = `language-${block.props.language}`;
        code.dataset.language = block.props.language;
        pre.appendChild(code);
        return {
          dom: pre,
          contentDOM: code,
        };
      },
    };
  },
  (options) => {
    return [
      createExtension({
        key: "code-block-highlighter",
        prosemirrorPlugins: [lazyShikiPlugin(options)],
      }),
      createExtension({
        key: "code-block-keyboard-shortcuts",
        keyboardShortcuts: {
          Delete: ({ editor }) => {
            return editor.transact((tr) => {
              const { block } = editor.getTextCursorPosition();
              if (block.type !== "codeBlock") {
                return false;
              }
              const { $from } = tr.selection;

              // When inside empty codeblock, on `DELETE` key press, delete the codeblock
              if (!$from.parent.textContent) {
                editor.removeBlocks([block]);

                return true;
              }

              return false;
            });
          },
          Tab: ({ editor }) => {
            if (options.indentLineWithTab === false) {
              return false;
            }

            return editor.transact((tr) => {
              const { block } = editor.getTextCursorPosition();
              if (block.type === "codeBlock") {
                // TODO should probably only tab when at a line start or already tabbed in
                tr.insertText("  ");
                return true;
              }

              return false;
            });
          },
          Enter: ({ editor }) => {
            return editor.transact((tr) => {
              const { block, nextBlock } = editor.getTextCursorPosition();
              if (block.type !== "codeBlock") {
                return false;
              }
              const { $from } = tr.selection;

              const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
              const endsWithDoubleNewline =
                $from.parent.textContent.endsWith("\n\n");

              // The user is trying to exit the code block by pressing enter at the end of the code block
              if (isAtEnd && endsWithDoubleNewline) {
                // Remove the double newline
                tr.delete($from.pos - 2, $from.pos);

                // If there is a next block, move the cursor to it
                if (nextBlock) {
                  editor.setTextCursorPosition(nextBlock, "start");
                  return true;
                }

                // If there is no next block, insert a new paragraph
                const [newBlock] = editor.insertBlocks(
                  [{ type: "paragraph" }],
                  block,
                  "after",
                );
                // Move the cursor to the new block
                editor.setTextCursorPosition(newBlock, "start");

                return true;
              }

              tr.insertText("\n");
              return true;
            });
          },
          "Shift-Enter": ({ editor }) => {
            return editor.transact(() => {
              const { block } = editor.getTextCursorPosition();
              if (block.type !== "codeBlock") {
                return false;
              }

              const [newBlock] = editor.insertBlocks(
                // insert a new paragraph
                [{ type: "paragraph" }],
                block,
                "after",
              );
              // move the cursor to the new block
              editor.setTextCursorPosition(newBlock, "start");
              return true;
            });
          },
        },
        inputRules: [
          {
            find: /^```(.*?)\s$/,
            replace: ({ match }) => {
              const languageName = match[1].trim();
              const attributes = {
                language: getLanguageId(options, languageName) ?? languageName,
              };

              return {
                type: "codeBlock",
                props: {
                  language: attributes.language,
                },
                content: [],
              };
            },
          },
        ],
      }),
    ];
  },
);

export function getLanguageId(
  options: CodeBlockOptions,
  languageName: string,
): string | undefined {
  return Object.entries(options.supportedLanguages ?? {}).find(
    ([id, { aliases }]) => {
      return aliases?.includes(languageName) || id === languageName;
    },
  )?.[0];
}
