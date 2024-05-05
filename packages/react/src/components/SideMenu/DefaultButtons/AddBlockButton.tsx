import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { AiOutlinePlus } from "react-icons/ai";

import { SideMenuProps } from "../SideMenuProps";
import { useComponentsContext } from "../../../editor/ComponentsContext";

export const AddBlockButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Pick<SideMenuProps<BSchema, I, S>, "addBlock">
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.SideMenu.Button
      className={"bn-button"}
      icon={
        <AiOutlinePlus
          size={24}
          onClick={props.addBlock}
          data-test="dragHandleAdd"
        />
      }
    />
  );
};
