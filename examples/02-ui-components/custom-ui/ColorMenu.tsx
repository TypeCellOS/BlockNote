import {
  FormattingToolbarProps,
  useEditorChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { HTMLAttributes, useState } from "react";
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

// Formatting Toolbar sub menu for changing text and background color
export const ColorMenu = (
  props: FormattingToolbarProps<any> & HTMLAttributes<HTMLDivElement>
) => {
  const { editor, className, ...rest } = props;

  // Colors of the currently selected text
  // TODO: Vite doesn't seem to be live-updating core & react?
  const [textColor, setTextColor] = useState<string>(
    (props.editor.getActiveStyles().textColor as string) || "default"
  );
  const [backgroundColor, setCurrentColor] = useState<string>(
    (props.editor.getActiveStyles().backgroundColor as string) || "default"
  );

  // Update the colors when the editor content or selection changes
  useEditorChange(() => {
    setTextColor(
      (props.editor.getActiveStyles().textColor as string) || "default"
    );
    setCurrentColor(
      (props.editor.getActiveStyles().backgroundColor as string) || "default"
    );
  }, props.editor);

  useEditorSelectionChange(() => {
    setTextColor(
      (props.editor.getActiveStyles().textColor as string) || "default"
    );
    setCurrentColor(
      (props.editor.getActiveStyles().backgroundColor as string) || "default"
    );
  }, props.editor);

  return (
    <div {...rest} className={`color-menu${className ? " " + className : ""}`}>
      {/*Group for text color buttons*/}
      <div className={"color-menu-group"}>
        {colors.map((color) => (
          // Button for each color
          <button
            className={`color-menu-item text ${color}${
              textColor === color ? " active" : ""
            }`}
            onClick={() => {
              color === "default"
                ? props.editor.removeStyles({ textColor: color })
                : props.editor.addStyles({ textColor: color });
            }}
            key={color}>
            <MdFormatColorText />
          </button>
        ))}
      </div>
      {/*Group for background color buttons*/}
      <div className={"color-menu-group"}>
        {colors.map((color) => (
          // Button for each color
          <button
            className={`color-menu-item background ${color}${
              backgroundColor === color ? " active" : ""
            }`}
            onClick={() => {
              color === "default"
                ? props.editor.removeStyles({ backgroundColor: color })
                : props.editor.addStyles({ backgroundColor: color });
            }}
            key={color}>
            <MdFormatColorText />
          </button>
        ))}
      </div>
    </div>
  );
};
