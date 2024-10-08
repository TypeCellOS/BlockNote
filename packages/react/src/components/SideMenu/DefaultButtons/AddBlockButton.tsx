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
import { useCallback } from "react";

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

  const onClick = useCallback(() => {
    const blockContent = props.block.content;
    const isBlockEmpty =
      blockContent !== undefined &&
      Array.isArray(blockContent) &&
      blockContent.length === 0;

    if (isBlockEmpty) {
      editor.setTextCursorPosition(props.block);
      editor.openSuggestionMenu("/");
    } else {
      const insertedBlock = editor.insertBlocks(
        [{ type: "paragraph" }],
        props.block,
        "after"
      )[0];
      editor.setTextCursorPosition(insertedBlock);
      editor.openSuggestionMenu("/");
    }
  }, [editor, props.block]);

  return (
    <Components.SideMenu.Button
      className={"bn-button"}
      label={dict.side_menu.add_block_label}
      icon={
        <AiOutlinePlus size={24} onClick={onClick} data-test="dragHandleAdd" />
      }
    />
  );
};
