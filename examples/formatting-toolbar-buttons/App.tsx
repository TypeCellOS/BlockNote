import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  BlockTypeDropdown,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbarPositioner,
  FormattingToolbarProps,
  HyperlinkToolbarPositioner,
  ImageCaptionButton,
  ImageToolbarPositioner,
  NestBlockButton,
  ReplaceImageButton,
  SideMenuPositioner,
  SlashMenuPositioner,
  TableHandlesPositioner,
  TextAlignButton,
  ToggledStyleButton,
  Toolbar,
  UnnestBlockButton,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

// From https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultFormattingToolbar.tsx
function CustomFormattingToolbar(props: FormattingToolbarProps) {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      <ImageCaptionButton editor={props.editor} />
      <ReplaceImageButton editor={props.editor} />

      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />
      {/* Added code toggle button */}
      <ToggledStyleButton editor={props.editor} toggledStyle={"code"} />

      <TextAlignButton editor={props.editor as any} textAlignment={"left"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"center"} />
      <TextAlignButton editor={props.editor as any} textAlignment={"right"} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  );
}

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} theme={"dark"}>
      <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={CustomFormattingToolbar}
      />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} />
      <TableHandlesPositioner editor={editor} />
    </BlockNoteView>
  );
}
