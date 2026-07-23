import { createExtension } from "../../../../editor/BlockNoteExtension.js";
import { CodeBlockOptions, getLanguageId } from "../../CodeBlockOptions.js";

export const CodeKeyboardShortcutsExtension =
  (options: CodeBlockOptions) => (key: string, blockType: string) =>
    createExtension({
      key,
      keyboardShortcuts: {
        Delete: ({ editor }) => {
          return editor.transact((tr) => {
            const { block } = editor.getTextCursorPosition();
            if (block.type !== blockType) {
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
            if (block.type === blockType) {
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
            if (block.type !== blockType) {
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
            if (block.type !== blockType) {
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
              type: blockType,
              props: {
                language: attributes.language,
              },
              content: [],
            };
          },
        },
      ],
    });
