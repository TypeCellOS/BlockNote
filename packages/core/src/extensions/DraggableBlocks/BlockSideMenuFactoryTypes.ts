import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Block, BlockSchema } from "../Blocks/api/blockTypes";

export type BlockSideMenuStaticParams<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;

  addBlock: () => void;

  blockDragStart: (event: DragEvent) => void;
  blockDragEnd: () => void;

  freezeMenu: () => void;
  unfreezeMenu: () => void;

  getReferenceRect: () => DOMRect;
};

export type BlockSideMenuDynamicParams<BSchema extends BlockSchema> = {
  block: Block<BSchema>;
};

export type BlockSideMenu<BSchema extends BlockSchema> = EditorElement<
  BlockSideMenuDynamicParams<BSchema>
>;
export type BlockSideMenuFactory<BSchema extends BlockSchema> = ElementFactory<
  BlockSideMenuStaticParams<BSchema>,
  BlockSideMenuDynamicParams<BSchema>
>;
