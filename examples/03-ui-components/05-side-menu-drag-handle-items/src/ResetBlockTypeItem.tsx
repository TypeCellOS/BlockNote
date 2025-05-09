import {
  DragHandleMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
} from "@blocknote/react";

export function ResetBlockTypeItem(props: DragHandleMenuProps) {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        editor.updateBlock(props.block, { type: "paragraph" });
      }}>
      Reset Type
    </Components.Generic.Menu.Item>
  );
}
