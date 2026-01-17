import "@blocknote/mantine/style.css";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
  useSelectedBlocks,
} from "@blocknote/react";

// Custom Formatting Toolbar Button to toggle blue text & background color.
export function BlueButton() {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  // Tracks whether the text & background are both blue.
  const isSelected = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.getActiveStyles().textColor === "blue" &&
      editor.getActiveStyles().backgroundColor === "blue",
  });

  // Doesn't render unless a at least one block with inline content is
  // selected. You can use a similar pattern of returning `null` to
  // conditionally render buttons based on the editor state.
  const blocks = useSelectedBlocks();
  if (blocks.filter((block) => block.content !== undefined).length === 0) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      mainTooltip={"Blue Text & Background"}
      onClick={() => {
        editor.toggleStyles({
          textColor: "blue",
          backgroundColor: "blue",
        });
      }}
      isSelected={isSelected}
    >
      Blue
    </Components.FormattingToolbar.Button>
  );
}
