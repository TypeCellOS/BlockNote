import {
  useBlockNoteEditor,
  useEditorChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { useState } from "react";
import { MdFormatColorText } from "react-icons/md";

export const colors = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

// Formatting Toolbar sub menu for changing text and background color.
export function ColorMenu(props: { className?: string }) {
  const editor = useBlockNoteEditor();

  // Colors of the currently selected text.
  const [textColor, setTextColor] = useState<string>(
    (editor.getActiveStyles().textColor as string) || "default"
  );
  const [backgroundColor, setCurrentColor] = useState<string>(
    (editor.getActiveStyles().backgroundColor as string) || "default"
  );

  // Updates the colors when the editor content or selection changes.
  useEditorChange(() => {
    setTextColor((editor.getActiveStyles().textColor as string) || "default");
    setCurrentColor(
      (editor.getActiveStyles().backgroundColor as string) || "default"
    );
  }, editor);
  useEditorSelectionChange(() => {
    setTextColor((editor.getActiveStyles().textColor as string) || "default");
    setCurrentColor(
      (editor.getActiveStyles().backgroundColor as string) || "default"
    );
  }, editor);

  return (
    <div
      className={`color-menu${props.className ? " " + props.className : ""}`}>
      {/* Group for text color buttons */}
      <div className={"color-menu-group"}>
        {colors.map((color) => (
          // Button for each color
          <button
            className={`color-menu-item text ${color}${
              textColor === color ? " active" : ""
            }`}
            onClick={() => {
              color === "default"
                ? editor.removeStyles({ textColor: color })
                : editor.addStyles({ textColor: color });
            }}
            key={color}>
            <MdFormatColorText />
          </button>
        ))}
      </div>
      {/* Group for background color buttons */}
      <div className={"color-menu-group"}>
        {colors.map((color) => (
          // Button for each color
          <button
            className={`color-menu-item background ${color}${
              backgroundColor === color ? " active" : ""
            }`}
            onClick={() => {
              color === "default"
                ? editor.removeStyles({ backgroundColor: color })
                : editor.addStyles({ backgroundColor: color });
            }}
            key={color}>
            <MdFormatColorText />
          </button>
        ))}
      </div>
    </div>
  );
}
