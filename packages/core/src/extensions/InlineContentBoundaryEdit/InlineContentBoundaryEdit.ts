import { Plugin, PluginKey, Selection, TextSelection } from "prosemirror-state";
import { createExtension } from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey("inline-content-boundary-edit");

// Whether a Backspace/Delete at `selection` would remove the entire content
// range `[content.from, content.to)` of an inline content node.
function emptiesInlineContent(
  selection: Selection,
  key: string,
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
            handleKeyDown: (view, event) => {
              if (!view.editable) {
                return false;
              }

              const isTypedChar =
                event.key.length === 1 && !event.ctrlKey && !event.metaKey;

              if (
                !isTypedChar &&
                event.key !== "Backspace" &&
                event.key !== "Delete"
              ) {
                return false;
              }

              const { selection } = view.state;
              const node = selection.$from.node();
              if (!node.type.spec.inline) {
                return false;
              }

              const pos = selection.$from.before();
              const contentFrom = pos + 1;
              const contentTo = pos + 1 + node.content.size;

              // Empty content: redirect the typed character into the node.
              if (isTypedChar && node.content.size === 0) {
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

              // Backspace/Delete that would empty the content: delete it all in
              // one transaction, keeping the now-empty node (and the caret
              // inside it) so it stays editable.
              if (
                node.content.size > 0 &&
                emptiesInlineContent(selection, event.key, {
                  from: contentFrom,
                  to: contentTo,
                })
              ) {
                const tr = view.state.tr.delete(contentFrom, contentTo);
                tr.setSelection(TextSelection.create(tr.doc, contentFrom));
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
