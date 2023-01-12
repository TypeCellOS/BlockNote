import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type BlockMenuParams = {
  addBlock: () => void;
  deleteBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
  blockBoundingBox: DOMRect;
};

export type BlockMenu = EditorElement<BlockMenuParams>;
export type BlockMenuFactory = ElementFactory<BlockMenuParams>;
