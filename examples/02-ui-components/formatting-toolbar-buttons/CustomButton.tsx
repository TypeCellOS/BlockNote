import { BlockNoteEditor } from "@blocknote/core";
import {
  ToolbarButton,
  useEditorChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { useState } from "react";

export const CustomButton = (props: { editor: BlockNoteEditor }) => {
  // Tracks whether the text & background are both blue.
  const [isSelected, setIsSelected] = useState<boolean>(
    props.editor.getActiveStyles().textColor === "blue" &&
      props.editor.getActiveStyles().backgroundColor === "blue"
  );

  // Updates state on content change.
  useEditorChange(() => {
    setIsSelected(
      props.editor.getActiveStyles().textColor === "blue" &&
        props.editor.getActiveStyles().backgroundColor === "blue"
    );
  }, props.editor);

  // Updates state on selection change.
  useEditorSelectionChange(() => {
    setIsSelected(
      props.editor.getActiveStyles().textColor === "blue" &&
        props.editor.getActiveStyles().backgroundColor === "blue"
    );
  }, props.editor);

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
