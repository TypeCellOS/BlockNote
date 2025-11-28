import { CommentsExtension } from "@blocknote/core/comments";
import {
  FilePanelExtension,
  FormattingToolbarExtension,
  LinkToolbarExtension,
  SideMenuExtension,
  SuggestionMenu,
  TableHandlesExtension,
} from "@blocknote/core/extensions";
import { lazy, Suspense } from "react";

import { FilePanelController } from "../components/FilePanel/FilePanelController.js";
import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController.js";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController.js";
import { SideMenuController } from "../components/SideMenu/SideMenuController.js";
import { GridSuggestionMenuController } from "../components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController.js";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController.js";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";

// Lazily load the comments components to avoid pulling in the comments extensions into the main bundle
const FloatingComposerController = lazy(
  () => import("../components/Comments/FloatingComposerController.js"),
);
const FloatingThreadController = lazy(
  () => import("../components/Comments/FloatingThreadController.js"),
);

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
      {editor.getExtension(LinkToolbarExtension) &&
        props.linkToolbar !== false && <LinkToolbarController />}
      {editor.getExtension(SuggestionMenu) && props.slashMenu !== false && (
        <SuggestionMenuController triggerCharacter="/" />
      )}
      {editor.getExtension(SuggestionMenu) && props.emojiPicker !== false && (
        <GridSuggestionMenuController
          triggerCharacter=":"
          columns={10}
          minQueryLength={2}
        />
      )}
      {editor.getExtension(SideMenuExtension) && props.sideMenu !== false && (
        <SideMenuController />
      )}
      {editor.getExtension(FilePanelExtension) && props.filePanel !== false && (
        <FilePanelController />
      )}
      {editor.getExtension(TableHandlesExtension) &&
        props.tableHandles !== false && <TableHandlesController />}
      {editor.getExtension(CommentsExtension) && props.comments !== false && (
        <Suspense>
          <FloatingComposerController />
          <FloatingThreadController />
        </Suspense>
      )}
    </>
  );
}
