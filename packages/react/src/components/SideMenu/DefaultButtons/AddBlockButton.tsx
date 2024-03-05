import { BlockSchema } from "@blocknote/core";
import { AiOutlinePlus } from "react-icons/ai";
import { SideMenuButton } from "../SideMenuButton";
import type { SideMenuProps } from "../SideMenuPositioner";

export const AddBlockButton = <BSchema extends BlockSchema>(
  props: SideMenuProps<BSchema, any, any>
) => (
  <SideMenuButton>
    <AiOutlinePlus
      size={24}
      onClick={props.addBlock}
      data-test={"dragHandleAdd"}
    />
  </SideMenuButton>
);
