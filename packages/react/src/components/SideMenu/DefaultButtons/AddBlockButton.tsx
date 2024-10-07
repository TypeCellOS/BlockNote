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
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";

export const AddBlockButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: Pick<SideMenuProps<BSchema, I, S>, "block">
) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<BSchema, I, S>();

  return (
    <Components.SideMenu.Button
      className={"bn-button"}
      label={dict.side_menu.add_block_label}
      icon={
        <AiOutlinePlus
          size={24}
          onClick={() => {
            const blockContent = props.block.content;
            const createNewBlock =
              blockContent === undefined ||
              !Array.isArray(blockContent) ||
              blockContent.length > 0;

            if (!createNewBlock) {
              editor.setTextCursorPosition(props.block);
              editor.openSuggestionMenu("/");
            } else {
              editor.setTextCursorPosition(props.block);
              editor.insertBlocks(
                [{ type: "paragraph" }],
                props.block,
                "after"
              );
              editor.setTextCursorPosition(
                editor.getTextCursorPosition().nextBlock!
              );
              editor.openSuggestionMenu("/");
            }
          }}
          data-test="dragHandleAdd"
        />
      }
    />
  );
};
