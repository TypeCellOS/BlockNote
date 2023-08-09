---
title: Formatting Toolbar
description: The Formatting Toolbar appears whenever you highlight text in the editor, and is mainly used for styling.
imageTitle: Formatting Toolbar
path: /docs/formatting-toolbar
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils";

const { isDark } = useData();
</script>

# Formatting Toolbar

The Formatting Toolbar appears whenever you highlight text in the editor, and is mainly used for styling.

<img style="max-width:600px" :src="isDark ? '/img/screenshots/formatting_toolbar_dark.png' : '/img/screenshots/formatting_toolbar.png'" alt="image">

## Custom Formatting Toolbar

If you want to change the buttons/dropdowns in the Formatting Toolbar, or replace it altogether, you can do that using a React component.

You can see how this is done in the example below, which has a custom Formatting Toolbar with four items. The first three are default items to toggle bold, italic, and underline, while the last one is a custom button which toggles the text and background colors to be blue.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  ToggledStyleButton,
  Toolbar,
  ToolbarButton,
  useBlockNote,
  useEditorContentChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import "@blocknote/core/style.css";

const CustomFormattingToolbar = (props: { editor: BlockNoteEditor }) => {
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
    <Toolbar>
      {/*Default button to toggle bold.*/}
      <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
      {/*Default button to toggle italic.*/}
      <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
      {/*Default button to toggle underline.*/}
      <ToggledStyleButton editor={props.editor} toggledStyle={"underline"} />
      {/*Custom button to toggle blue text & background color.*/}
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
    </Toolbar>
  );
};

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={CustomFormattingToolbar}
      />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
    </BlockNoteView>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

`CustomFormattingToolbar` is the component we use to replace the default Formatting Toolbar. You can see it's made up of a bunch of other components that are exported by BlockNote. Read on to [Components](/docs/formatting-toolbar#components) to find out more about these.

After creating `CustomFormattingToolbar`, we tell BlockNote to use it inside `BlockNoteView`. [Changing UI Elements](/docs/ui-elements) has more information about how this is done.

## Components

It might seem daunting to create your own Formatting Toolbar from scratch, which is why BlockNote provides React components that you can use which match the default styling.

### Default Components

BlockNote exports all components used to create the default layout - both the toolbar itself and the items in it. Head to the [default Formatting Toolbar's source code](https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/FormattingToolbar/components/DefaultFormattingToolbar.tsx) to see all the components that you can use.

### Custom Components

BlockNote also provides components that you can use to make your own toolbar items, which also match the default styling:

```typescript
// Custom dropdown.
type ToolbarDropdownProps = {
  // Array representing the items in the dropdown.
  items: Array<{
    // Item name/text.
    text: string;
    // Icon next to the text.
    icon?: IconType;
    // Function to execute on click.
    onClick?: (e: MouseEvent) => void;
    // Condition for when the item is selected/active.
    isSelected?: boolean;
    // Whether the item should be clickable.
    isDisabled?: boolean;
  }>;
  // Whether the dropdown should be clickable.
  isDisabled?: boolean;
};
const ToolbarDropdown = (props: ToolbarDropdownProps): JSX.Element => ...;

// Custom button.
type ToolbarButtonProps = {
  // Main tooltip, which is shown on hover.
  mainTooltip: string;
  // Secondary tooltip, usually showing the keyboard shortcut.
  secondaryTooltip?: string;
  // Icon for the button.
  icon?: IconType;
  // Function to execute on click.
  onClick?: (e: MouseEvent) => void;
  // Condition for when the item is selected/active.
  isSelected?: boolean;
  // Whether the item should be clickable.
  isDisabled?: boolean;
  // Child components, usually just the button text. If no children are 
  // given, make sure to provide an icon.
  children?: any;
};
export const ToolbarButton = (props: ToolbarButtonProps) => ...;
```
