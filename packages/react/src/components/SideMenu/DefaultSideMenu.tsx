import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SideMenuState,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandle } from "./DefaultButtons/DragHandle";
import { SideMenu } from "./SideMenu";
import { FC } from "react";
import type { DragHandleMenuProps } from "./DragHandleMenu/DragHandleMenu";

export type SideMenuProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = {
  dragHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
} & Omit<SideMenuState<BSchema, I, S>, keyof UiElementPosition> &
  Pick<
    BlockNoteEditor<BSchema, I, S>["sideMenu"],
    | "addBlock"
    | "blockDragStart"
    | "blockDragEnd"
    | "freezeMenu"
    | "unfreezeMenu"
  >;

export const DefaultSideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: SideMenuProps<BSchema, I, S>
) => {
  const { addBlock, ...rest } = props;

  return (
    <SideMenu>
      <AddBlockButton addBlock={addBlock} />
      <DragHandle {...rest} />
    </SideMenu>
  );
};
