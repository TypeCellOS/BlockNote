import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
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

  const linkInSchema = checkLinkInSchema(editor);

  const selectedBlocks = useSelectedBlocks(editor);

  const [opened, setOpened] = useState(false);
  const [url, setUrl] = useState<string>(editor.getSelectedLinkUrl() || "");
  const [text, setText] = useState<string>(editor.getSelectedText());

  useEditorContentOrSelectionChange(() => {
    setText(editor.getSelectedText() || "");
    setUrl(editor.getSelectedLinkUrl() || "");
  }, editor);

  useEffect(() => {
    const callback = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        setOpened(true);
        event.preventDefault();
      }
    };

    if (editor.headless) {
      return;
    }

    editor.prosemirrorView.dom.addEventListener("keydown", callback);

    return () => {
      editor.prosemirrorView.dom.removeEventListener("keydown", callback);
    };
  }, [editor.prosemirrorView, editor.headless]);

  const update = useCallback(
    (url: string) => {
      editor.createLink(url);
      setOpened(false);
      editor.focus();
    },
    [editor],
  );

  const isTableSelection = editor.transact((tr) =>
    isTableCellSelection(tr.selection),
  );

  const show = useMemo(() => {
    if (!linkInSchema) {
      return false;
    }

    for (const block of selectedBlocks) {
      if (block.content === undefined) {
        return false;
      }
    }

    return !isTableSelection;
  }, [linkInSchema, selectedBlocks, isTableSelection]);

  if (
    !show ||
    !("link" in editor.schema.inlineContentSchema) ||
    !editor.isEditable
  ) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={opened}>
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
          onClick={() => setOpened(true)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <EditLinkMenuItems
          url={url}
          text={text}
          editLink={update}
          showTextField={false}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
