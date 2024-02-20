import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { SideMenuProps } from "../SideMenuProps";
import { SideMenuWrapper } from "./SideMenuWrapper";
import { AddBlockButton } from "./DefaultButtons/AddBlockButton";
import { DragHandle } from "./DefaultButtons/DragHandle";

export const SideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: SideMenuProps<BSchema, I, S>
) => {
  const { addBlock, ...rest } = props;

  return (
    <SideMenuWrapper>
      <AddBlockButton addBlock={addBlock} />
      <DragHandle {...rest} />
    </SideMenuWrapper>
  );
};
