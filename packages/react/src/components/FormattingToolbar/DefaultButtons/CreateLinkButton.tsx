import { useEffect, useState } from "react";
import { RiLink } from "react-icons/ri";

import {
  BlockNoteEditor,
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  isTableCellSelection,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { EditLinkMenuItems } from "../../LinkToolbar/EditLinkMenuItems.js";

function checkLinkInSchema(
  editor: BlockNoteEditor<BlockSchema, any, StyleSchema>,
): editor is BlockNoteEditor<
  BlockSchema,
  {
    link: {
      type: "link";
      propSchema: any;
      content: "styled";
    };
  },
  StyleSchema
> {
  return (
    "link" in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema["link"] === "link"
  );
}

export const CreateLinkButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const [showPopover, setShowPopover] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      // Do not show if:
      if (
        // The editor is read-only.
        !editor.isEditable ||
        // Links are not in the schema.
        !checkLinkInSchema(editor) ||
        // Table cells are selected.
        isTableCellSelection(editor.prosemirrorState.selection) ||
        // None of the selected blocks have inline content
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        url: editor.getSelectedLinkUrl(),
        text: editor.getSelectedText(),
      };
    },
  });

  // Makes Ctrl+K/Meta+K open link creation popover.
  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        setShowPopover(true);
        event.preventDefault();
      }
    };

    editor.prosemirrorView.dom.addEventListener("keydown", callback);

    return () => {
      editor.prosemirrorView.dom.removeEventListener("keydown", callback);
    };
  }, [editor.prosemirrorView, editor.headless]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={showPopover}>
      <Components.Generic.Popover.Trigger>
        {/* TODO: hide tooltip on click */}
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          data-test="createLink"
          label={dict.formatting_toolbar.link.tooltip}
          mainTooltip={dict.formatting_toolbar.link.tooltip}
          secondaryTooltip={formatKeyboardShortcut(
            dict.formatting_toolbar.link.secondary_tooltip,
            dict.generic.ctrl_shortcut,
          )}
          icon={<RiLink />}
          onClick={() => setShowPopover(true)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <EditLinkMenuItems
          url={state.url || ""}
          text={state.text}
          showTextField={false}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
