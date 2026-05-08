import type { Node as PMNode } from "prosemirror-model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey<DecorationSet>("trailingNode");

// Skip the widget when the document already ends with an empty paragraph
// block, since the user can just type into it.
function shouldShowTrailingWidget(doc: PMNode): boolean {
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

            const view = editor.prosemirrorView;
            if (!view) {
              return;
            }

            const blockContainerType =
              view.state.schema.nodes["blockContainer"];
            const paragraphType = view.state.schema.nodes["paragraph"];
            const node = blockContainerType.create(
              undefined,
              paragraphType.create(),
            );
            const insertPos = view.state.doc.content.size - 1;
            const tr = view.state.tr.insert(insertPos, node);
            tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
            tr.scrollIntoView();
            view.dispatch(tr);
            view.focus();
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
    ): DecorationSet {
      const mapped = oldSet.map(tr.mapping, tr.doc);
      const existing = mapped.find();
      const wasShowing = existing.length > 0;
      const shouldShow = shouldShowTrailingWidget(tr.doc);

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
              nextDecorationSet(state.tr, DecorationSet.empty),
            apply: (tr, oldSet) => {
              if (!tr.docChanged) {
                return oldSet;
              }
              return nextDecorationSet(tr, oldSet);
            },
          },
          props: {
            decorations: (state) => {
              if (!editor.isEditable) {
                return null;
              }
              return PLUGIN_KEY.getState(state);
            },
          },
        }),
      ],
    } as const;
  },
);
