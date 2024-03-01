import {
  useBlockNoteEditor,
  useEditorChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { useState } from "react";
import {
  MdAddLink,
  MdFormatAlignCenter,
  MdFormatAlignJustify,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatBold,
  MdFormatColorText,
  MdFormatItalic,
  MdFormatUnderlined,
} from "react-icons/md";

import { ColorMenu } from "./ColorMenu";
import { LinkMenu } from "./LinkMenu";

type CustomFormattingToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;

  textAlignment: "left" | "center" | "right" | "justify";

  textColor: string;
  backgroundColor: string;
};

// Custom component to replace the default Formatting Toolbar.
export function CustomFormattingToolbar() {
  const editor = useBlockNoteEditor();

  // Function to get the state of toolbar buttons (active/inactive).
  const getState = (): CustomFormattingToolbarState => {
    const block = editor.getTextCursorPosition().block;
    const activeStyles = editor.getActiveStyles();

    return {
      bold: (activeStyles.bold as boolean) || false,
      italic: (activeStyles.italic as boolean) || false,
      underline: (activeStyles.underline as boolean) || false,

      textAlignment: block.props.textAlignment,

      textColor: (activeStyles.textColor as string) || "default",
      backgroundColor: (activeStyles.backgroundColor as string) || "default",
    };
  };

  // Callback to set text alignment.
  const setTextAlignment = (
    textAlignment: CustomFormattingToolbarState["textAlignment"]
  ) => {
    const selection = editor.getSelection();

    if (selection) {
      for (const block of selection.blocks) {
        editor.updateBlock(block, {
          props: { textAlignment: textAlignment },
        });
      }
    } else {
      const block = editor.getTextCursorPosition().block;

      editor.updateBlock(block, {
        props: { textAlignment: textAlignment },
      });
    }
  };

  // Keeps track of the state of toolbar buttons.
  const [state, setState] = useState<CustomFormattingToolbarState>(getState());

  // Keeps track of if the color and link sub menus are open.
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);

  // Updates toolbar state when the editor content or selection changes.
  useEditorChange(() => setState(getState()), editor);
  useEditorSelectionChange(() => setState(getState()), editor);

  return (
    <div className={"formatting-toolbar"}>
      {/* Button group for toggled text styles. */}
      <div className={"formatting-toolbar-group"}>
        {/* Toggle bold button */}
        <button
          className={`formatting-toolbar-button${state.bold ? " active" : ""}`}
          onClick={() => editor.toggleStyles({ bold: true })}>
          <MdFormatBold />
        </button>
        {/* Toggle italic button */}
        <button
          className={`formatting-toolbar-button${
            state.italic ? " active" : ""
          }`}
          onClick={() => editor.toggleStyles({ italic: true })}>
          <MdFormatItalic />
        </button>
        {/* Toggle underline button */}
        <button
          className={`formatting-toolbar-button${
            state.underline ? " active" : ""
          }`}
          onClick={() => editor.toggleStyles({ underline: true })}>
          <MdFormatUnderlined />
        </button>
      </div>
      {/* Button group for text alignment */}
      <div className={"formatting-toolbar-group"}>
        {/*Left align button*/}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "left" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("left")}>
          <MdFormatAlignLeft />
        </button>
        {/* Center align button */}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "center" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("center")}>
          <MdFormatAlignCenter />
        </button>
        {/* Right align button */}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "right" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("right")}>
          <MdFormatAlignRight />
        </button>
        {/* Justify text button */}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "justify" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("justify")}>
          <MdFormatAlignJustify />
        </button>
      </div>
      {/* Button group for color menu */}
      <div className={"formatting-toolbar-group"}>
        <div className={"color-menu-button"}>
          <button
            className={`formatting-toolbar-button${
              colorMenuOpen ? " active" : ""
            }`}
            onClick={() => setColorMenuOpen(!colorMenuOpen)}>
            <MdFormatColorText />
          </button>
          <ColorMenu className={!colorMenuOpen ? "hidden" : undefined} />
        </div>
      </div>
      {/* Button group for link menu */}
      <div className={"formatting-toolbar-group"}>
        <div className={"link-menu-button"}>
          <button
            className={`formatting-toolbar-button${
              linkMenuOpen ? " active" : ""
            }`}
            onClick={() => setLinkMenuOpen(!linkMenuOpen)}>
            <MdAddLink />
          </button>
          <LinkMenu
            editor={editor}
            className={!linkMenuOpen ? "hidden" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
