import { Plugin, PluginKey, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { createExtension } from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey("inline-content-boundary-edit");

// Whether a Backspace/Delete at `selection` would remove the entire content
// range `[content.from, content.to)` of an inline content node.
// Other keys aren't deletion attempts; treating a typed character as Delete
// would erase a single-character node instead of inserting the character.
function emptiesInlineContent(
  selection: Selection,
  key: "Backspace" | "Delete",
  content: { from: number; to: number },
) {
  if (!selection.empty) {
    return selection.from <= content.from && selection.to >= content.to;
  }

  const isSingleChar = content.to - content.from === 1;

  return key === "Backspace"
    ? isSingleChar && selection.from === content.to
    : isSingleChar && selection.from === content.from;
}

function deleteInlineContent(view: EditorView, key: "Backspace" | "Delete") {
  const { selection } = view.state;
  const node = selection.$from.node();
  if (!node.type.spec.inline || node.content.size === 0) {
    return false;
  }

  const from = selection.$from.before() + 1;
  const to = from + node.content.size;
  if (!emptiesInlineContent(selection, key, { from, to })) {
    return false;
  }

  const tr = view.state.tr.delete(from, to);
  tr.setSelection(TextSelection.create(tr.doc, from));
  view.dispatch(tr);
  return true;
}

// Fixes editing at the boundary of an empty custom inline content node (i.e. an
// inline node with editable content, like a mention or inline math).
//
// An empty inline node can't hold a text cursor, so ProseMirror can't reconcile
// edits across the empty boundary from the DOM: typing into an empty node
// inserts text next to it rather than inside, and deleting the last character
// leaves an un-reconcilable empty node that corrupts/freezes the editor. Both
// boundary edits are handled here via transactions so the caret stays inside
// the node, which is kept alive and editable in its empty state.
//
// The cursor is inside such a node exactly when its directly-enclosing node is
// inline (`inline: true` in the spec) - regular text blocks aren't inline, and
// atomic inline content can't hold a cursor - so the handling applies to any
// inline content type without needing to know it by name.
export const InlineContentBoundaryEditExtension = createExtension(
  () =>
    ({
      key: "inlineContentBoundaryEdit",
      prosemirrorPlugins: [
        new Plugin({
          key: PLUGIN_KEY,
          props: {
            handleDOMEvents: {
              beforeinput(view, event) {
                if (!view.editable || !event.cancelable || event.isComposing) {
                  return false;
                }

                // A DOM change from the preceding key can cause ProseMirror
                // to skip this key's command. Still preserve the inline node
                // before the browser's native deletion runs.
                const key =
                  event.inputType === "deleteContentBackward"
                    ? "Backspace"
                    : event.inputType === "deleteContentForward"
                      ? "Delete"
                      : undefined;
                if (!key || !deleteInlineContent(view, key)) {
                  return false;
                }
                event.preventDefault();
                return true;
              },
            },
            handleKeyDown: (view, event) => {
              if (!view.editable) {
                return false;
              }

              if (event.key === "Backspace" || event.key === "Delete") {
                return deleteInlineContent(view, event.key);
              }

              const isTypedChar =
                event.key.length === 1 && !event.ctrlKey && !event.metaKey;

              if (!isTypedChar) {
                return false;
              }

              const { selection } = view.state;
              const node = selection.$from.node();
              if (!node.type.spec.inline) {
                return false;
              }

              const pos = selection.$from.before();
              const contentFrom = pos + 1;

              // Empty content: redirect the typed character into the node.
              if (node.content.size === 0) {
                const tr = view.state.tr.insert(
                  contentFrom,
                  view.state.schema.text(event.key),
                );
                tr.setSelection(
                  TextSelection.create(tr.doc, contentFrom + event.key.length),
                );
                view.dispatch(tr);

                return true;
              }

              return false;
            },
          },
        }),
      ],
    }) as const,
);
