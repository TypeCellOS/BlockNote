import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { ReactNode } from "react";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  children?: ReactNode;
}) {
  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent
        editor={props.editor?._tiptapEditor}
        // TODO: Better class name
        className={"BlockNote"}>
        {props.children || (
          <>
            <FormattingToolbarPositioner editor={props.editor} />
            <HyperlinkToolbarPositioner editor={props.editor} />
            <SlashMenuPositioner editor={props.editor} />
            <SideMenuPositioner editor={props.editor} />
          </>
        )}
      </EditorContent>
    </MantineProvider>
  );
}
