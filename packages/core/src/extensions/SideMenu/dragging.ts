import { Node } from "prosemirror-model";
import { NodeSelection, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createExternalHTMLExporter } from "../../api/exporters/html/externalHTMLExporter.js";
import { cleanHTMLToMarkdown } from "../../api/exporters/markdown/markdownExporter.js";
import { fragmentToBlocks } from "../../api/nodeConversions/fragmentToBlocks.js";
import { getNodeById } from "../../api/nodeUtil.js";
import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { MultipleNodeSelection } from "./MultipleNodeSelection.js";

let dragImageElement: Element | undefined;

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = UiElementPosition & {
  // The block that the side menu is attached to.
  block: Block<BSchema, I, S>;
};

function blockPositionsFromSelection(selection: Selection, doc: Node) {
  // Absolute positions just before the first block spanned by the selection, and just after the last block. Having the
  // selection start and end just before and just after the target blocks ensures no whitespace/line breaks are left
  // behind after dragging & dropping them.
  let beforeFirstBlockPos: number;
  let afterLastBlockPos: number;

  // Even the user starts dragging blocks but drops them in the same place, the selection will still be moved just
  // before & just after the blocks spanned by the selection, and therefore doesn't need to change if they try to drag
  // the same blocks again. If this happens, the anchor & head move out of the block content node they were originally
  // in. If the anchor should update but the head shouldn't and vice versa, it means the user selection is outside a
  // block content node, which should never happen.
  const selectionStartInBlockContent =
    doc.resolve(selection.from).node().type.spec.group === "blockContent";
  const selectionEndInBlockContent =
    doc.resolve(selection.to).node().type.spec.group === "blockContent";

  // Ensures that entire outermost nodes are selected if the selection spans multiple nesting levels.
  const minDepth = Math.min(selection.$anchor.depth, selection.$head.depth);

  if (selectionStartInBlockContent && selectionEndInBlockContent) {
    // Absolute positions at the start of the first block in the selection and at the end of the last block. User
    // selections will always start and end in block content nodes, but we want the start and end positions of their
    // parent block nodes, which is why minDepth - 1 is used.
    const startFirstBlockPos = selection.$from.start(minDepth - 1);
    const endLastBlockPos = selection.$to.end(minDepth - 1);

    // Shifting start and end positions by one moves them just outside the first and last selected blocks.
    beforeFirstBlockPos = doc.resolve(startFirstBlockPos - 1).pos;
    afterLastBlockPos = doc.resolve(endLastBlockPos + 1).pos;
  } else {
    beforeFirstBlockPos = selection.from;
    afterLastBlockPos = selection.to;
  }

  return { from: beforeFirstBlockPos, to: afterLastBlockPos };
}

function setDragImage(view: EditorView, from: number, to = from) {
  if (from === to) {
    // Moves to position to be just after the first (and only) selected block.
    to += view.state.doc.resolve(from + 1).node().nodeSize;
  }

  // Parent element is cloned to remove all unselected children without affecting the editor content.
  const parentClone = view.domAtPos(from).node.cloneNode(true) as Element;
  const parent = view.domAtPos(from).node as Element;

  const getElementIndex = (parentElement: Element, targetElement: Element) =>
    Array.prototype.indexOf.call(parentElement.children, targetElement);

  const firstSelectedBlockIndex = getElementIndex(
    parent,
    // Expects from position to be just before the first selected block.
    view.domAtPos(from + 1).node.parentElement!,
  );
  const lastSelectedBlockIndex = getElementIndex(
    parent,
    // Expects to position to be just after the last selected block.
    view.domAtPos(to - 1).node.parentElement!,
  );

  for (let i = parent.childElementCount - 1; i >= 0; i--) {
    if (i > lastSelectedBlockIndex || i < firstSelectedBlockIndex) {
      parentClone.removeChild(parentClone.children[i]);
    }
  }

  // dataTransfer.setDragImage(element) only works if element is attached to the DOM.
  unsetDragImage(view.root);
  dragImageElement = parentClone;

  // Browsers may have CORS policies which prevents iframes from being
  // manipulated, so better to stay on the safe side and remove them from the
  // drag preview. The drag preview doesn't work with iframes anyway.
  const iframes = dragImageElement.getElementsByTagName("iframe");
  for (let i = 0; i < iframes.length; i++) {
    const iframe = iframes[i];
    const parent = iframe.parentElement;

    if (parent) {
      parent.removeChild(iframe);
    }
  }

  // TODO: This is hacky, need a better way of assigning classes to the editor so that they can also be applied to the
  //  drag preview.
  const classes = view.dom.className.split(" ");
  const inheritedClasses = classes
    .filter(
      (className) =>
        className !== "ProseMirror" &&
        className !== "bn-root" &&
        className !== "bn-editor",
    )
    .join(" ");

  dragImageElement.className =
    dragImageElement.className + " bn-drag-preview " + inheritedClasses;

  if (view.root instanceof ShadowRoot) {
    view.root.appendChild(dragImageElement);
  } else {
    view.root.body.appendChild(dragImageElement);
  }
}

export function unsetDragImage(rootEl: Document | ShadowRoot) {
  if (dragImageElement !== undefined) {
    if (rootEl instanceof ShadowRoot) {
      rootEl.removeChild(dragImageElement);
    } else {
      rootEl.body.removeChild(dragImageElement);
    }

    dragImageElement = undefined;
  }
}

export function dragStart<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  e: { dataTransfer: DataTransfer | null; clientY: number },
  block: Block<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>,
) {
  if (!e.dataTransfer) {
    return;
  }

  if (editor.headless) {
    return;
  }
  const view = editor.prosemirrorView;

  const posInfo = getNodeById(block.id, view.state.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${block.id} not found`);
  }
  const pos = posInfo.posBeforeNode;

  if (pos != null) {
    const selection = view.state.selection;
    const doc = view.state.doc;

    const { from, to } = blockPositionsFromSelection(selection, doc);

    const draggedBlockInSelection = from <= pos && pos < to;
    const multipleBlocksSelected =
      selection.$anchor.node() !== selection.$head.node() ||
      selection instanceof MultipleNodeSelection;

    if (draggedBlockInSelection && multipleBlocksSelected) {
      view.dispatch(
        view.state.tr.setSelection(MultipleNodeSelection.create(doc, from, to)),
      );
      setDragImage(view, from, to);
    } else {
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)),
      );
      setDragImage(view, pos);
    }

    const selectedSlice = view.state.selection.content();
    const schema = editor.pmSchema;

    const clipboardHTML =
      view.serializeForClipboard(selectedSlice).dom.innerHTML;

    const externalHTMLExporter = createExternalHTMLExporter(schema, editor);

    const blocks = fragmentToBlocks(selectedSlice.content);
    const externalHTML = externalHTMLExporter.exportBlocks(blocks, {});

    const plainText = cleanHTMLToMarkdown(externalHTML);

    e.dataTransfer.clearData();
    e.dataTransfer.setData("blocknote/html", clipboardHTML);
    e.dataTransfer.setData("text/html", externalHTML);
    e.dataTransfer.setData("text/plain", plainText);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(dragImageElement!, 0, 0);
  }
}
