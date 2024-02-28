import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { AiOutlinePlus } from "react-icons/ai";

import { SideMenuProps } from "../../SideMenuProps";
import { SideMenuButton } from "../SideMenuButton";

export const AddBlockButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Pick<SideMenuProps<BSchema, I, S>, "addBlock">
) => (
  <SideMenuButton>
    <AiOutlinePlus
      size={24}
      onClick={props.addBlock}
      data-test={"dragHandleAdd"}
    />
  </SideMenuButton>
);
