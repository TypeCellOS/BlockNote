import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { EditorComponent, Remirror, RemirrorProps } from "@remirror/react";
// import { BlockNoteTheme } from "./BlockNoteTheme";
// import { MantineProvider } from "@mantine/core";

export function BlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>;
  } & Omit<RemirrorProps, "manager">
) {
  // const { manager, ...remainingProps } = props;
  return (
    // TODO: Should we wrap editor in MantineProvider? Otherwise we have to duplicate color hex values.
    // <MantineProvider theme={BlockNoteTheme}>
    // <EditorContent editor={props.editor?._tiptapEditor || null} />
    <Remirror manager={props.editor!._manager} {...props}>
      <EditorComponent />
      {/* <div>hello {Math.random()}</div> */}
    </Remirror>
    // </MantineProvider>
  );
}
