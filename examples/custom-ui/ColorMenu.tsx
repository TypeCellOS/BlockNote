import {
  FormattingToolbarProps,
  useEditorContentChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { HTMLAttributes, useState } from "react";
import { MdFormatColorText } from "react-icons/md";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";

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
  props: FormattingToolbarProps<
    DefaultBlockSchema,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  > &
    HTMLAttributes<HTMLDivElement>
) => {
  const { editor, className, ...rest } = props;

  // Colors of the currently selected text
  const [textColor, setTextColor] = useState<string>(
    props.editor.getActiveStyles().textColor || "default"
  );
  const [backgroundColor, setCurrentColor] = useState<string>(
    props.editor.getActiveStyles().backgroundColor || "default"
  );

  // Update the colors when the editor content or selection changes
  useEditorContentChange(props.editor, () => {
    setTextColor(props.editor.getActiveStyles().textColor || "default");
    setCurrentColor(
      props.editor.getActiveStyles().backgroundColor || "default"
    );
  });
  useEditorSelectionChange(props.editor, () => {
    setTextColor(props.editor.getActiveStyles().textColor || "default");
    setCurrentColor(
      props.editor.getActiveStyles().backgroundColor || "default"
    );
  });

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
