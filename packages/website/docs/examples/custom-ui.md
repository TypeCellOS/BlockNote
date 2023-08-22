---
title: Making UI Elements From Scratch
description: In this example, we create a custom static Formatting Toolbar from scratch, as well as a Slash Menu and Side Menu.
imageTitle: Making UI Elements From Scratch
path: /examples/custom-ui
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Making UI Elements From Scratch

In this example, we create a custom static Formatting Toolbar from scratch, as well as a Slash Menu and Side Menu.

**Relevant Docs:**

- [Formatting Toolbar](/docs/formatting-toolbar)
- [Slash Menu](/docs/slash-menu)
- [Side Menu](/docs/side-menu)
- [Replacing UI Elements](/docs/ui-elements#replacing-ui-elements)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import { CustomSlashMenu } from "./CustomSlashMenu";
import { CustomSideMenu } from "./CustomSideMenu";

import "./styles.css";

function App() {
  const editor = useBlockNote();

  return (
    <BlockNoteView editor={editor}>
      {/*Adding custom UI elements*/}
      <CustomFormattingToolbar editor={editor} />
      <CustomSlashMenu editor={editor} />
      <CustomSideMenu editor={editor} />
    </BlockNoteView>
  );
}

export default App;
```

```typescript-vue /ColorMenu.tsx
import {
  FormattingToolbarProps,
  useEditorContentChange,
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
  props: FormattingToolbarProps & HTMLAttributes<HTMLDivElement>
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
```

```typescript-vue /LinkMenu.tsx
import { FormattingToolbarProps } from "@blocknote/react";
import { HTMLAttributes, useState } from "react";

// Formatting Toolbar sub menu for creating links
export const LinkMenu = (
  props: FormattingToolbarProps & HTMLAttributes<HTMLDivElement>
) => {
  const { editor, className, ...rest } = props;

  const [text, setText] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  return (
    <div {...rest} className={`link-menu${className ? " " + className : ""}`}>
      {/*Input for link text*/}
      <input
        className={"link-input"}
        placeholder={"Text"}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {/*Input for link URL*/}
      <input
        className={"link-input"}
        placeholder={"URL"}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      {/*Buttons to create and clear the inputs*/}
      <div className={"link-buttons"}>
        <button
          className={"link-button"}
          onClick={() => props.editor.createLink(url, text)}>
          Create
        </button>
        <button
          className={"link-button"}
          onClick={() => {
            setText("");
            setUrl("");
          }}>
          Clear
        </button>
      </div>
    </div>
  );
};
```

```typescript-vue /CustomFormattingToolbar.tsx
import {
  FormattingToolbarProps,
  useEditorContentChange,
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

export const CustomFormattingToolbar = (props: FormattingToolbarProps) => {
  // Function to get the state of toolbar buttons (active/inactive)
  const getState = (): CustomFormattingToolbarState => {
    const block = props.editor.getTextCursorPosition().block;
    const activeStyles = props.editor.getActiveStyles();

    return {
      bold: activeStyles.bold || false,
      italic: activeStyles.italic || false,
      underline: activeStyles.underline || false,

      textAlignment: block.props.textAlignment,

      textColor: activeStyles.textColor || "default",
      backgroundColor: activeStyles.backgroundColor || "default",
    };
  };

  // Callback to set text alignment
  const setTextAlignment = (
    textAlignment: CustomFormattingToolbarState["textAlignment"]
  ) => {
    const selection = props.editor.getSelection();

    if (selection) {
      for (const block of selection.blocks) {
        props.editor.updateBlock(block, {
          props: { textAlignment: textAlignment },
        });
      }
    } else {
      const block = props.editor.getTextCursorPosition().block;

      props.editor.updateBlock(block, {
        props: { textAlignment: textAlignment },
      });
    }
  };

  // Keeps track of the state of toolbar buttons
  const [state, setState] = useState<CustomFormattingToolbarState>(getState());

  // Keeps track of if the color and link sub menus are open
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);

  // Updates toolbar state when the editor content or selection changes
  useEditorContentChange(props.editor, () => setState(getState()));
  useEditorSelectionChange(props.editor, () => setState(getState()));

  return (
    <div className={"formatting-toolbar"}>
      {/*Button group for toggled text styles*/}
      <div className={"formatting-toolbar-group"}>
        {/*Toggle bold button*/}
        <button
          className={`formatting-toolbar-button${state.bold ? " active" : ""}`}
          onClick={() => props.editor.toggleStyles({ bold: true })}>
          <MdFormatBold />
        </button>
        {/*Toggle italic button*/}
        <button
          className={`formatting-toolbar-button${
            state.italic ? " active" : ""
          }`}
          onClick={() => props.editor.toggleStyles({ italic: true })}>
          <MdFormatItalic />
        </button>
        {/*Toggle underline button*/}
        <button
          className={`formatting-toolbar-button${
            state.underline ? " active" : ""
          }`}
          onClick={() => props.editor.toggleStyles({ underline: true })}>
          <MdFormatUnderlined />
        </button>
      </div>
      {/*Button group for text alignment*/}
      <div className={"formatting-toolbar-group"}>
        {/*Left align button*/}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "left" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("left")}>
          <MdFormatAlignLeft />
        </button>
        {/*Center align button*/}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "center" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("center")}>
          <MdFormatAlignCenter />
        </button>
        {/*Right align button*/}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "right" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("right")}>
          <MdFormatAlignRight />
        </button>
        {/*Justify text button*/}
        <button
          className={`formatting-toolbar-button${
            state.textAlignment === "justify" ? " active" : ""
          }`}
          onClick={() => setTextAlignment("justify")}>
          <MdFormatAlignJustify />
        </button>
      </div>
      {/*Button group for color menu*/}
      <div className={"formatting-toolbar-group"}>
        <div className={"color-menu-button"}>
          <button
            className={`formatting-toolbar-button${
              colorMenuOpen ? " active" : ""
            }`}
            onClick={() => setColorMenuOpen(!colorMenuOpen)}>
            <MdFormatColorText />
          </button>
          <ColorMenu
            editor={props.editor}
            className={!colorMenuOpen ? "hidden" : undefined}
          />
        </div>
      </div>
      {/*Button group for link menu*/}
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
            editor={props.editor}
            className={!linkMenuOpen ? "hidden" : undefined}
          />
        </div>
      </div>
    </div>
  );
};
```

```typescript-vue /CustomSlashMenu.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { ReactSlashMenuItem, SlashMenuPositioner } from "@blocknote/react";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

// Icons for slash menu items
const icons = {
  Paragraph: RiText,
  Heading: RiH1,
  "Heading 2": RiH2,
  "Heading 3": RiH3,
  "Numbered List": RiListOrdered,
  "Bullet List": RiListUnordered,
};

export const CustomSlashMenu = (props: { editor: BlockNoteEditor }) => {
  const editor = props.editor;

  return (
    <SlashMenuPositioner
      editor={editor}
      slashMenu={(props) => {
        // Sorts items by group
        const groups: Record<string, ReactSlashMenuItem[]> = {};
        for (const item of props.filteredItems) {
          if (!groups[item.group]) {
            groups[item.group] = [];
          }

          groups[item.group].push(item);
        }

        // If query matches no items, show "No matches" message
        if (props.filteredItems.length === 0) {
          return <div className={"slash-menu"}>No matches</div>;
        }

        return (
          <div className={"slash-menu"}>
            {Object.entries(groups).map(([group, items]) => (
              // Component for each group
              <div key={group} className={"slash-menu-group"}>
                {/*Group label*/}
                <div className={"slash-menu-label"}>{group}</div>
                {/*Group items*/}
                <div className={"slash-menu-item-group"}>
                  {items.map((item) => {
                    const Icon =
                      item.name in icons
                        ? icons[item.name as keyof typeof icons]
                        : "div";
                    return (
                      <button
                        key={item.name}
                        className={`slash-menu-item${
                          props.filteredItems.indexOf(item) ===
                          props.keyboardHoveredItemIndex
                            ? " active"
                            : ""
                        }`}
                        onClick={() => {
                          item.execute(editor);
                          editor.focus();
                        }}>
                        <Icon />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
};
```

```typescript-vue /CustomSideMenu.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { SideMenuPositioner } from "@blocknote/react";
import { RxDragHandleHorizontal } from "react-icons/rx";

export const CustomSideMenu = (props: { editor: BlockNoteEditor }) => (
  <SideMenuPositioner
    editor={props.editor}
    sideMenu={(props) => (
      // Side menu consists of only a drag handle
      <div
        className={"side-menu"}
        draggable="true"
        onDragStart={props.blockDragStart}
        onDragEnd={props.blockDragEnd}>
        <RxDragHandleHorizontal />
      </div>
    )}
  />
);
```

```css-vue /styles.css
* {
    font-family: "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont,
    "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
    "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}

.color-menu {
    position: absolute;
    z-index: 9999;

    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;

    display: flex;
    flex-direction: column;
    gap: 4px;

    margin-top: 8px;
    padding: 4px;
}

.color-menu-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
}

.color-menu-item {
    position: relative;

    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    align-items: center;
    display: flex;
    flex-direction: row;
    gap: 4px;
    justify-content: center;

    padding: 0;

    height: 24px;
    width: 24px;
}

.text.red {
    color: #e03e3e;
}

.text.orange {
    color: #d9730d;
}

.text.yellow {
    color: #dfab01;
}

.text.green {
    color: #4d6461;
}

.text.blue {
    color: #0b6e99;
}

.text.purple {
    color: #6940a5;
}

.background.red {
    background-color: #fbe4e4;
}

.background.orange {
    background-color: #f6e9d9;
}

.background.yellow {
    background-color: #fbf3db;
}

.background.green {
    background-color: #ddedea;
}

.background.blue {
    background-color: #ddebf1;
}

.background.purple {
    background-color: #eae4f2;
}

.color-menu-item.text:hover {
    background-color: lightgray;
}

.color-menu-item.background:hover {
    color: gray;
}

.link-menu {
    position: absolute;
    z-index: 9999;

    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;

    display: flex;
    flex-direction: column;
    gap: 4px;

    margin-top: 8px;
    padding: 4px;
}

.link-input {
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    padding: 4px;
}

.link-buttons {
    display: flex;
    flex-direction: row;
    gap: 4px;
}

.link-button {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    cursor: pointer;

    font-size: 14px;

    flex-grow: 1;
}

.link-button:hover {
    background-color: lightgray;
}

.formatting-toolbar {
    position: sticky;
    z-index: 9999;

    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 8px #dddddd;

    display: flex;
    flex-direction: row;
    gap: 16px;

    margin-inline: 54px;
    margin-bottom: 8px;
    padding: 4px;

    top: 8px;
}

.formatting-toolbar-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
}

.formatting-toolbar-button {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    cursor: pointer;

    font-size: 16px;

    align-items: center;
    display: flex;
    justify-content: center;

    height: 32px;
    width: 32px;
}

.formatting-toolbar-button:hover {
    background-color: lightgray;
}

.slash-menu {
    z-index: 9999;

    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 8px #dddddd;

    display: flex;
    flex-direction: column;
    gap: 8px;

    padding: 8px;

    top: 8px;
}

.slash-menu-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.slash-menu-label {
    color: gray;
    font-size: 12px;
}

.slash-menu-item-group {
    display: flex;
    flex-direction: row;
    gap: 4px;
}

.slash-menu-item {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    cursor: pointer;

    font-size: 16px;

    align-items: center;
    display: flex;
    flex-direction: row;

    padding: 8px;
}

.slash-menu-item:hover {
    background-color: lightgray;
}

.side-menu {
    background-color: white;
    border: 1px solid lightgray;
    border-radius: 2px;
    box-shadow: 0 0 4px #dddddd;

    cursor: pointer;

    align-items: center;
    display: flex;
    justify-content: center;

    margin-right: 4px;
    padding: 8px;
}

.active {
    box-shadow: inset 0 0 6px #cccccc;
}

.hidden {
    display: none;
}

{{ getStyles(isDark) }}
```

:::