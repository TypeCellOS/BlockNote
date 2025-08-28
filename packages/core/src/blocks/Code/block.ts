import type { HighlighterGeneric } from "@shikijs/types";
import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { lazyShikiPlugin } from "./shiki.js";

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
    }
  >;
  /**
   * The highlighter to use for code blocks.
   */
  createHighlighter?: () => Promise<HighlighterGeneric<any, any>>;
};

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
      meta: {
        code: true,
        defining: true,
      },
    }) as const,
);

export const createCodeBlockSpec = createBlockSpec(
  createCodeBlockConfig,
  (options) => ({
    parse: (e) => {
      const pre = e.querySelector("pre");
      if (!pre) {
        return undefined;
      }

      return {};
    },

    render(block, editor) {
      const wrapper = document.createDocumentFragment();
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.content as unknown as string;
      pre.appendChild(code);
      const select = document.createElement("select");
      const selectWrapper = document.createElement("div");
      const handleLanguageChange = (event: Event) => {
        const language = (event.target as HTMLSelectElement).value;

        editor.updateBlock(block.id, { props: { language } });
      };

      Object.entries(options.supportedLanguages ?? {}).forEach(
        ([id, { name }]) => {
          const option = document.createElement("option");

          option.value = id;
          option.text = name;
          select.appendChild(option);
        },
      );

      selectWrapper.contentEditable = "false";
      select.value = block.props.language || options.defaultLanguage || "text";
      wrapper.appendChild(selectWrapper);
      wrapper.appendChild(pre);
      selectWrapper.appendChild(select);
      select.addEventListener("change", handleLanguageChange);
      return {
        dom: wrapper,
        contentDOM: code,
        destroy: () => {
          select.removeEventListener("change", handleLanguageChange);
        },
      };
    },
    toExternalHTML(block) {
      const pre = document.createElement("pre");
      pre.className = `language-${block.props.language}`;
      pre.dataset.language = block.props.language;
      const code = document.createElement("code");
      code.textContent = block.content as unknown as string;
      pre.appendChild(code);
      return {
        dom: pre,
      };
    },
  }),
  (options) => {
    return [
      createBlockNoteExtension({
        key: "code-block-highlighter",
        plugins: [lazyShikiPlugin(options)],
      }),
      createBlockNoteExtension({
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
