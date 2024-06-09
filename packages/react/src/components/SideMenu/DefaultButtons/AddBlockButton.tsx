import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { AiOutlinePlus } from "react-icons/ai";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useDictionary } from "../../../i18n/dictionary";
import { SideMenuProps } from "../SideMenuProps";

export const AddBlockButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Pick<SideMenuProps<BSchema, I, S>, "addBlock">
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  return (
    <Components.SideMenu.Button
      className={"bn-button"}
      label={dict.side_menu.add_block_label}
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
