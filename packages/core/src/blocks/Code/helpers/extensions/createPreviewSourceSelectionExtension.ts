import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getBlockInfoFromSelection } from "../../../../api/getBlockInfoFromPos.js";
import { createExtension } from "../../../../editor/BlockNoteExtension.js";

/**
 * The class added to a preview-source block (e.g. the math block) while the
 * selection is inside it. Because the source is shown in a popup rather than
 * inline, the block never gets a native node selection, so this gives CSS a
 * hook to highlight the preview (mimicking `ProseMirror-selectednode`).
 */
export const PREVIEW_SOURCE_SELECTED_CLASS = "bn-preview-source-selected";

/**
 * Adds {@link PREVIEW_SOURCE_SELECTED_CLASS} to the block's content node
 * whenever the selection sits inside it.
 */
export const createPreviewSourceSelectionExtension = (
  key: string,
  blockType: string,
) =>
  createExtension({
    key,
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey(`${key}-plugin`),
        props: {
          decorations: (state) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (
              !blockInfo.isBlockContainer ||
              blockInfo.blockNoteType !== blockType
            ) {
              return null;
            }

            return DecorationSet.create(state.doc, [
              Decoration.node(
                blockInfo.blockContent.beforePos,
                blockInfo.blockContent.afterPos,
                { class: PREVIEW_SOURCE_SELECTED_CLASS },
              ),
            ]);
          },
        },
      }),
    ],
  });
