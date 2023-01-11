import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type AddBlockButtonParams = {
  addBlock: () => void;
  blockBoundingBox: DOMRect;
};

export type AddBlockButton = EditorElement<AddBlockButtonParams>;
export type AddBlockButtonFactory = ElementFactory<AddBlockButtonParams>;

export type DragHandleParams = {
  blockBoundingBox: DOMRect;
};

export type DragHandle = EditorElement<DragHandleParams>;
export type DragHandleFactory = ElementFactory<DragHandleParams>;

export type DragHandleMenuParams = {
  deleteBlock: () => void;
  dragHandleBoundingBox: DOMRect;
};

export type DragHandleMenu = EditorElement<DragHandleMenuParams>;
export type DragHandleMenuFactory = ElementFactory<DragHandleMenuParams>;
