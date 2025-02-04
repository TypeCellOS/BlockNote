import { BlockNoteEditor, BlockSchema, DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema, InlineContentSchema, SideMenuState, StyleSchema, UiElementPosition } from "@blocknote/core";
import { FC } from "react";
import { DragHandleMenuProps } from "./DragHandleMenu/DragHandleMenuProps.js";
export type SideMenuProps<BSchema extends BlockSchema = DefaultBlockSchema, I extends InlineContentSchema = DefaultInlineContentSchema, S extends StyleSchema = DefaultStyleSchema> = {
    editor: BlockNoteEditor<BSchema, I, S>;
    dragHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
} & Omit<SideMenuState<BSchema, I, S>, keyof UiElementPosition> & Pick<BlockNoteEditor<BSchema, I, S>["sideMenu"], "blockDragStart" | "blockDragEnd" | "freezeMenu" | "unfreezeMenu">;
