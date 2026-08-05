import type { Node as PMNode } from "prosemirror-model";
import {
  Plugin,
  PluginKey,
  Selection,
  type Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey<DecorationSet>("trailingNode");

// Skip the widget when the editor isn't editable, or when the document already
// ends with an empty paragraph block (since the user can just type into it).
function shouldShowTrailingWidget(doc: PMNode, isEditable: boolean): boolean {
  if (!isEditable) {
    return false;
  }

  const rootGroup = doc.lastChild;
  const lastBlock = rootGroup?.lastChild;
  const lastContent = lastBlock?.firstChild;

  return !(
    lastBlock?.type.name === "blockContainer" &&
    lastContent?.type.name === "paragraph" &&
    lastContent.content.size === 0
  );
}

/**
 * Renders a fake trailing block as a widget decoration after the last block of
 * the document. Clicking it inserts a real trailing block and moves the
 * selection into it. This way the trailing block is not part of the document
 * content, so it doesn't appear when the editor is read-only or when the
 * content is exported.
 */
export const TrailingNodeExtension = createExtension(
  ({ editor }: ExtensionOptions) => {
    function createTrailingWidget(pos: number): Decoration {
      return Decoration.widget(
        pos,
        () => {
          const el = document.createElement("div");
          el.className = "bn-trailing-block";
          el.contentEditable = "false";
          el.addEventListener("mousedown", (event) => {
            // Stop ProseMirror from trying to place the selection somewhere
            // based on this click.
            event.preventDefault();

            editor.transact((tr) => {
              const [insertedBlock] = editor.insertBlocks(
                [{ type: "paragraph" }],
                editor.document[editor.document.length - 1],
                "after",
              );
              editor.setTextCursorPosition(insertedBlock, "start");
              tr.scrollIntoView();
            });

            editor.prosemirrorView?.focus();
          });
          return el;
        },
        { side: 1 },
      );
    }

    // Maps the existing DecorationSet through the transaction, then
    // incrementally adds or removes the widget only if the show/hide state
    // crossed over. The underlying Decoration (and its rendered DOM) stays
    // reference-stable across transactions.
    function nextDecorationSet(
      tr: Transaction,
      oldSet: DecorationSet,
      isEditable: boolean,
    ): DecorationSet {
      const mapped = oldSet.map(tr.mapping, tr.doc);
      const existing = mapped.find();
      const wasShowing = existing.length > 0;
      const shouldShow = shouldShowTrailingWidget(tr.doc, isEditable);

      if (wasShowing === shouldShow) {
        return mapped;
      }
      if (wasShowing) {
        return mapped.remove(existing);
      }
      return mapped.add(tr.doc, [
        createTrailingWidget(tr.doc.content.size - 1),
      ]);
    }

    return {
      key: "trailingNode",
      prosemirrorPlugins: [
        new Plugin<DecorationSet>({
          key: PLUGIN_KEY,
          state: {
            init: (_, state) =>
              nextDecorationSet(
                state.tr,
                DecorationSet.empty,
                editor.isEditable,
              ),
            apply: (tr, oldSet) => {
              if (!tr.docChanged && !tr.getMeta(PLUGIN_KEY)) {
                return oldSet;
              }
              return nextDecorationSet(tr, oldSet, editor.isEditable);
            },
          },
          // Editable changes don't dispatch a transaction on their own, so the
          // plugin state can't re-evaluate on its own. Watch for the change
          // and dispatch a no-op transaction tagged with this plugin's key so
          // `apply` re-runs and adds or removes the widget.
          view(view) {
            let lastEditable = view.editable;
            return {
              update(view) {
                if (view.editable === lastEditable) {
                  return;
                }
                lastEditable = view.editable;
                view.dispatch(view.state.tr.setMeta(PLUGIN_KEY, true));
              },
            };
          },
          props: {
            decorations: (state) => PLUGIN_KEY.getState(state),
            // Prevents ProseMirror from trying to move the selection into the
            // trailing block, which causes the text caret to flicker in it
            // before returning to its previous position.
            handleKeyDown: (view, event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowDown") {
                return false;
              }

              const { selection } = view.state;
              if (!selection.empty) {
                return false;
              }

              const docEnd = Selection.atEnd(view.state.doc);
              if (selection.$head.pos !== docEnd.$head.pos) {
                return false;
              }

              if (
                !shouldShowTrailingWidget(view.state.doc, editor.isEditable)
              ) {
                return false;
              }

              event.preventDefault();
              return true;
            },
          },
        }),
      ],
    } as const;
  },
);
