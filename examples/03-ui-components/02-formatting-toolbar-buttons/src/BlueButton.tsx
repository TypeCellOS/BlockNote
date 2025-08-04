import "@blocknote/mantine/style.css";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useEditorContentOrSelectionChange,
  useSelectedBlocks,
} from "@blocknote/react";
import { useState } from "react";

// Custom Formatting Toolbar Button to toggle blue text & background color.
export function BlueButton() {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  // Tracks whether the text & background are both blue.
  const [isSelected, setIsSelected] = useState<boolean>(
    editor.getActiveStyles().textColor === "blue" &&
      editor.getActiveStyles().backgroundColor === "blue",
  );

  // Updates state on content or selection change.
  useEditorContentOrSelectionChange(() => {
    setIsSelected(
      editor.getActiveStyles().textColor === "blue" &&
        editor.getActiveStyles().backgroundColor === "blue",
    );
  }, editor);

  // Doesn't render unless a at least one block with inline content is 
  // selected. You can use a similar pattern of returning `null` to 
  // conditionally render buttons based on the editor state.
  const blocks = useSelectedBlocks();
  if (blocks.filter((block) => block.content !== undefined)) {
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
