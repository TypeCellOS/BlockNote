import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type BlockSideMenuStaticParams = {
  addBlock: () => void;
  deleteBlock: () => void;
  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
  freezeMenu: () => void;
  unfreezeMenu: () => void;
};

export type BlockSideMenuDynamicParams = {
  referenceRect: DOMRect;
};

export type BlockSideMenu = EditorElement<BlockSideMenuDynamicParams>;
export type BlockSideMenuFactory = ElementFactory<
  BlockSideMenuStaticParams,
  BlockSideMenuDynamicParams
>;
