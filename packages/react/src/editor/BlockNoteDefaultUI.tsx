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
import { AttributionTooltipController } from "../components/AttributionTooltip/AttributionTooltipController.js";
import { EmojiPickerController } from "../components/SuggestionMenu/EmojiPicker/EmojiPickerController.js";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController.js";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { PortalElementsMap, resolvePortalTarget } from "./portalElements.js";

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

  /**
   * Whether the suggestion-marks attribution tooltip (shown on hover over a
   * suggestion mark in collaboration/suggestion mode) should be enabled.
   */
  attributionTooltip?: boolean;

  /**
   * Per-element portal targets for floating UI. Each key corresponds to one
   * of the default UI elements; values can be an `HTMLElement`, a CSS
   * selector string, or `null` (= `document.body`). The optional `default`
   * key controls where `editor.portalElement` itself is mounted; when
   * omitted, the editor's `bn-container` element is used.
   *
   * Per-element keys override `default` for that one element. Unspecified
   * elements fall back to `default` via `editor.portalElement`.
   */
  portalElements?: PortalElementsMap;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider",
    );
  }

  const map = props.portalElements;
  const formattingToolbarPortal = resolvePortalTarget(map?.formattingToolbar);
  const linkToolbarPortal = resolvePortalTarget(map?.linkToolbar);
  const slashMenuPortal = resolvePortalTarget(map?.slashMenu);
  const emojiPickerPortal = resolvePortalTarget(map?.emojiPicker);
  const sideMenuPortal = resolvePortalTarget(map?.sideMenu);
  const filePanelPortal = resolvePortalTarget(map?.filePanel);
  const tableHandlesPortal = resolvePortalTarget(map?.tableHandles);
  const commentsPortal = resolvePortalTarget(map?.comments);
  const attributionTooltipPortal = resolvePortalTarget(map?.attributionTooltip);

  return (
    <>
      {editor.getExtension(FormattingToolbarExtension) &&
        props.formattingToolbar !== false && (
          <FormattingToolbarController
            portalElement={formattingToolbarPortal}
          />
        )}
      {editor.getExtension(LinkToolbarExtension) &&
        props.linkToolbar !== false && (
          <LinkToolbarController portalElement={linkToolbarPortal} />
        )}
      {editor.getExtension(SuggestionMenu) && props.slashMenu !== false && (
        <SuggestionMenuController
          triggerCharacter="/"
          shouldOpen={(state) =>
            !state.selection.$from.parent.type.isInGroup("tableContent")
          }
          portalElement={slashMenuPortal}
        />
      )}
      {editor.getExtension(SuggestionMenu) && props.emojiPicker !== false && (
        <EmojiPickerController
          triggerCharacter=":"
          portalElement={emojiPickerPortal}
        />
      )}
      {editor.getExtension(SideMenuExtension) && props.sideMenu !== false && (
        <SideMenuController portalElement={sideMenuPortal} />
      )}
      {editor.getExtension(FilePanelExtension) && props.filePanel !== false && (
        <FilePanelController portalElement={filePanelPortal} />
      )}
      {editor.getExtension(TableHandlesExtension) &&
        props.tableHandles !== false && (
          <TableHandlesController portalElement={tableHandlesPortal} />
        )}
      {editor.getExtension(CommentsExtension) && props.comments !== false && (
        <Suspense>
          <FloatingComposerController portalElement={commentsPortal} />
          <FloatingThreadController portalElement={commentsPortal} />
        </Suspense>
      )}
      {editor.getExtension("attribution") &&
        props.attributionTooltip !== false && (
          <AttributionTooltipController
            portalElement={attributionTooltipPortal}
          />
        )}
    </>
  );
}
