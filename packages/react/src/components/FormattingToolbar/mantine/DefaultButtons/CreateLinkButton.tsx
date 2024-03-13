import { useCallback, useMemo, useState } from "react";
import { RiLink } from "react-icons/ri";

import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { EditHyperlinkMenu } from "../../../HyperlinkToolbar/mantine/EditHyperlinkMenu/EditHyperlinkMenu";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdownButton } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownButton";

function checkLinkInSchema<BSchema extends BlockSchema, S extends StyleSchema>(
  editor: BlockNoteEditor<BSchema, any, S>
): editor is BlockNoteEditor<
  BSchema,
  {
    link: {
      type: "link";
      propSchema: any;
      content: "styled";
    };
  },
  S
> {
  return (
    "link" in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema["link"] === "link"
  );
}

export const CreateLinkButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  selectedBlocks: Block<BSchema, I, S>[];
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const linkInSchema = checkLinkInSchema(editor);

  const [url, setUrl] = useState<string>(editor.getSelectedLinkUrl() || "");
  const [text, setText] = useState<string>(editor.getSelectedText());

  useEditorContentOrSelectionChange(() => {
    setText(editor.getSelectedText() || "");
    setUrl(editor.getSelectedLinkUrl() || "");
  }, editor);

  const update = useCallback(
    (url: string, text: string) => {
      editor.createLink(url, text);
      editor.focus();
    },
    [editor]
  );

  const show = useMemo(() => {
    if (!linkInSchema) {
      return false;
    }

    for (const block of props.selectedBlocks) {
      if (block.content === undefined) {
        return false;
      }
    }

    return true;
  }, [linkInSchema, props.selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarInputDropdownButton
      target={
        <ToolbarButton
          mainTooltip={"Create Link"}
          secondaryTooltip={formatKeyboardShortcut("Mod+K")}
          icon={RiLink}
        />
      }
      dropdown={<EditHyperlinkMenu url={url} text={text} update={update} />}
    />
  );
};
