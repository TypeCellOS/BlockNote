import { EditorElement, ElementFactory } from "../../shared/EditorElement";

export type BlockSideMenuStaticParams = {
  addBlock: () => void;
  deleteBlock: () => void;
  setMenuFrozen: (menuFrozen: boolean) => void;
  setBlockEditable: (blockEditable: boolean) => void;

  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;
};

export type BlockSideMenuDynamicParams = {
  menuFrozen: boolean;
  blockEditable: boolean;

  blockBoundingBox: DOMRect;
};

export type BlockSideMenu = EditorElement<BlockSideMenuDynamicParams>;
export type BlockSideMenuFactory = ElementFactory<
  BlockSideMenuStaticParams,
  BlockSideMenuDynamicParams
>;
