import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import {
  ToolbarButton,
  useEditorContentChange,
  useEditorSelectionChange,
} from "@blocknote/react";

export const CustomButton = (props: { editor: BlockNoteEditor }) => {
  // Tracks whether the text & background are both blue.
  const [isSelected, setIsSelected] = useState<boolean>(
    props.editor.getActiveStyles().textColor === "blue" &&
      props.editor.getActiveStyles().backgroundColor === "blue"
  );

  // Updates state on content change.
  useEditorContentChange(props.editor, () => {
    setIsSelected(
      props.editor.getActiveStyles().textColor === "blue" &&
        props.editor.getActiveStyles().backgroundColor === "blue"
    );
  });

  // Updates state on selection change.
  useEditorSelectionChange(props.editor, () => {
    setIsSelected(
      props.editor.getActiveStyles().textColor === "blue" &&
        props.editor.getActiveStyles().backgroundColor === "blue"
    );
  });

  return (
    <ToolbarButton
      mainTooltip={"Blue Text & Background"}
      onClick={() => {
        props.editor.toggleStyles({
          textColor: "blue",
          backgroundColor: "blue",
        });
      }}
      isSelected={isSelected}>
      Blue
    </ToolbarButton>
  );
};
