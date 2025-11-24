import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import { AiOutlinePlus } from "react-icons/ai";

import { useCallback } from "react";
import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";

export const AddBlockButton = () => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor<any, any, any>();

  const suggestionMenu = useExtension(SuggestionMenu);
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  const onClick = useCallback(() => {
    if (block === undefined) {
      return;
    }

    const blockContent = block.content;
    const isBlockEmpty =
      blockContent !== undefined &&
      Array.isArray(blockContent) &&
      blockContent.length === 0;

    if (isBlockEmpty) {
      editor.setTextCursorPosition(block);
      suggestionMenu.openSuggestionMenu("/");
    } else {
      const insertedBlock = editor.insertBlocks(
        [{ type: "paragraph" }],
        block,
        "after",
      )[0];
      editor.setTextCursorPosition(insertedBlock);
      suggestionMenu.openSuggestionMenu("/");
    }
  }, [block, editor, suggestionMenu]);

  if (block === undefined) {
    return null;
  }

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
