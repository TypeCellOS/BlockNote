import { Node } from "prosemirror-model";
import { NodeSelection, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createExternalHTMLExporter } from "../../api/exporters/html/externalHTMLExporter.js";
import { cleanHTMLToMarkdown } from "../../api/exporters/markdown/markdownExporter.js";
import { fragmentToBlocks } from "../../api/nodeConversions/fragmentToBlocks.js";
import { getNodeById } from "../../api/nodeUtil.js";
import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { MultipleNodeSelection } from "./MultipleNodeSelection.js";

let dragImageElement: Element | undefined;

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

  // A copy of the element that holds the dragged blocks, without its other
  // children: a copy of each dragged block's element. The holding element can
  // have no box of its own (`display: contents`, e.g. the slot of a React
  // layout block), but the preview needs one.
  const blocks = view.domAtPos(from).node.cloneNode(false) as HTMLElement;
  blocks.style.removeProperty("display");
  for (let pos = from; pos < to; pos += view.state.doc.nodeAt(pos)!.nodeSize) {
    const blockDOM = view.nodeDOM(pos);
    if (!blockDOM) {
      throw new Error(`The dragged block at ${pos} has no DOM.`);
    }
    blocks.appendChild(blockDOM.cloneNode(true));
  }

  // Browsers may have CORS policies which prevents iframes from being
  // manipulated, so better to stay on the safe side and remove them from the
  // drag preview. The drag preview doesn't work with embedded documents
  // (iframe/embed/object) anyway, and including an <embed> (e.g. a PDF)
  // can prevent the drag from initiating at all.
  blocks
    .querySelectorAll("iframe, embed, object")
    .forEach((el) => el.parentElement?.removeChild(el));

  // The preview is outside the editor, so it copies what styles the blocks
  // there: the theme of the editor's container (classes, color scheme, theme
  // variables), the editor's classes, and the blocks' width, so that text
  // wraps and images scale as in the editor.
  const container = view.dom.parentElement?.closest(".bn-root");
  const preview =
    (container?.cloneNode(false) as HTMLElement | undefined) ??
    document.createElement("div");
  preview.removeAttribute("id");
  preview.classList.add("bn-drag-preview");
  const editor = document.createElement("div");
  editor.className = view.dom.className;
  editor.appendChild(blocks);
  preview.appendChild(editor);

  // The layout is inline, so that app CSS on the copied classes (e.g. a height
  // on `.bn-editor`) does not change it. The preview is off-screen, as the
  // browser only needs it for its snapshot: `opacity` would also hide it in
  // the snapshot in Firefox and Safari. Taller than the cap, it would reach
  // into the page from above.
  Object.assign(preview.style, {
    background: "transparent",
    position: "absolute",
    top: "-10000px",
    left: "0",
    margin: "0",
    padding: "10px",
    height: "auto",
    minHeight: "0",
    maxHeight: "75vh",
    overflow: "hidden",
  });
  Object.assign(editor.style, {
    // Keep the editor's background out of the empty space around the blocks.
    background: "transparent",
    width: `${(view.nodeDOM(from) as HTMLElement).offsetWidth}px`,
    height: "auto",
    minHeight: "0",
    maxHeight: "none",
    margin: "0",
    padding: "0",
    overflow: "visible",
  });

  // dataTransfer.setDragImage(element) only works if element is attached to the DOM.
  unsetDragImage(view.root);
  dragImageElement = preview;
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
    // The type of the dragged blocks' parent. The editors parse the blocks
    // into it (see `blockDropHandling.ts`), so that a block that only this
    // parent can hold is not wrapped in a new copy of it.
    e.dataTransfer.setData(
      "blocknote/parent",
      view.state.selection.$from.parent.type.name,
    );
    e.dataTransfer.setData("text/html", externalHTML);
    e.dataTransfer.setData("text/plain", plainText);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(dragImageElement!, 0, 0);
  }
}
