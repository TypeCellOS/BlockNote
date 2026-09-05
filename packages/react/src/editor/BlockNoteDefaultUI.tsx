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
import { GridSuggestionMenuController } from "../components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController.js";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController.js";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { PortalElementsMap, resolvePortalElement } from "./portalElements.js";

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
   * key sets the target for every element without its own entry; when
   * omitted, the element wrapping the editor is used (its `bn-container` in
   * the default layout).
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
  const formattingToolbarPortal = resolvePortalElement(map?.formattingToolbar);
  const linkToolbarPortal = resolvePortalElement(map?.linkToolbar);
  const slashMenuPortal = resolvePortalElement(map?.slashMenu);
  const emojiPickerPortal = resolvePortalElement(map?.emojiPicker);
  const sideMenuPortal = resolvePortalElement(map?.sideMenu);
  const filePanelPortal = resolvePortalElement(map?.filePanel);
  const tableHandlesPortal = resolvePortalElement(map?.tableHandles);
  const commentsPortal = resolvePortalElement(map?.comments);
  const attributionTooltipPortal = resolvePortalElement(
    map?.attributionTooltip,
  );

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
        <GridSuggestionMenuController
          triggerCharacter=":"
          columns={10}
          minQueryLength={2}
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
