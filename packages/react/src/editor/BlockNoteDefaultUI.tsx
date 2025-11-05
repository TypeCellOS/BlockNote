import {
  CommentsPlugin,
  FormattingToolbarExtension,
  SideMenuProsemirrorPlugin,
  SuggestionMenuPlugin,
  TableHandlesPlugin,
} from "@blocknote/core";

import { FloatingComposerController } from "../components/Comments/FloatingComposerController.js";
import { FloatingThreadController } from "../components/Comments/FloatingThreadController.js";
import { FilePanelController } from "../components/FilePanel/FilePanelController.js";
import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController.js";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController.js";
import { SideMenuController } from "../components/SideMenu/SideMenuController.js";
import { GridSuggestionMenuController } from "../components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController.js";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController.js";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";

export type BlockNoteDefaultUIProps = {
  /**
   * Whether the formatting toolbar should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/formatting-toolbar}
   */
  formattingToolbar?: boolean;

  /**
   * Whether the link toolbar should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/link-toolbar}
   */
  linkToolbar?: boolean;

  /**
   * Whether the slash menu should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/suggestion-menus#slash-menu}
   */
  slashMenu?: boolean;

  /**
   * Whether the block side menu should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/side-menu}
   */
  sideMenu?: boolean;

  /**
   * Whether the file panel should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/file-panel}
   */
  filePanel?: boolean;

  /**
   * Whether the table handles should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/table-handles}
   */
  tableHandles?: boolean;

  /**
   * Whether the emoji picker should be enabled.
   * @see {@link https://blocknotejs.org/docs/advanced/grid-suggestion-menus#emoji-picker}
   */
  emojiPicker?: boolean;

  /**
   * Whether the default comments UI feature should be enabled.
   * @see {@link https://blocknotejs.org/docs/react/components/comments}
   */
  comments?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider",
    );
  }

  return (
    <>
      {editor.getExtension(FormattingToolbarExtension) &&
        props.formattingToolbar !== false && <FormattingToolbarController />}
      {props.linkToolbar !== false && <LinkToolbarController />}
      {editor.getExtension(SuggestionMenuPlugin) &&
        props.slashMenu !== false && (
          <SuggestionMenuController triggerCharacter="/" />
        )}
      {editor.getExtension(SuggestionMenuPlugin) &&
        props.emojiPicker !== false && (
          <GridSuggestionMenuController
            triggerCharacter=":"
            columns={10}
            minQueryLength={2}
          />
        )}
      {editor.getExtension(SideMenuProsemirrorPlugin) &&
        props.sideMenu !== false && <SideMenuController />}
      {props.filePanel !== false && <FilePanelController />}
      {editor.getExtension(TableHandlesPlugin) &&
        props.tableHandles !== false && <TableHandlesController />}
      {editor.getExtension(CommentsPlugin) && props.comments !== false && (
        <>
          <FloatingComposerController />
          <FloatingThreadController />
        </>
      )}
    </>
  );
}
