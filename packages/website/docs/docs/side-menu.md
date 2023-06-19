---
title: Block Side Menu
description: The Block Side Menu appears whenever you hover over a block, and is used to drag & drop the block as well as add new ones below it.
imageTitle: Block Side Menu
path: /docs/side-menu
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils"; 
import {ref} from "vue"; 

const { isDark } = useData();
</script>

# Block Side Menu

The Block Side Menu appears whenever you hover over a block, and is used to drag & drop the block as well as add new ones below it.

<img style="max-width:500px" :src="isDark ? '/img/screenshots/side_menu_dark.png' : '/img/screenshots/side_menu.png'" alt="image">

You can also click the drag handle in the Block Side Menu (`⠿`) to open the Drag Handle Menu.

<img style="max-width:250px" :src="isDark ? '/img/screenshots/drag_handle_menu_dark.png' : '/img/screenshots/drag_handle_menu.png'" alt="image">

## Custom Drag Handle Menu

BlockNote lets you customize which items appear in the Drag Handle Menu. Have a look at the example below, in which the color picker item is replaced with a custom item that opens an alert.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { Block, BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  createReactBlockSideMenuFactory,
  DragHandleMenu,
  DragHandleMenuItem,
  RemoveBlockButton,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";

const CustomDragHandleMenu = (props: {
  editor: BlockNoteEditor;
  block: Block;
  closeMenu: () => void;
}) => {
  return (
    <DragHandleMenu>
      {/*Default button to remove the block.*/}
      <RemoveBlockButton {...props}>
        Delete
      </RemoveBlockButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem
        closeMenu={props.closeMenu}
        onClick={() => {
          window.alert("Button Pressed!");
          props.closeMenu();
        }}>
        Open Alert
      </DragHandleMenuItem>
    </DragHandleMenu>
  );
};

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
    customElements: {
      // Makes the editor instance use the custom menu.
      dragHandleMenu: CustomDragHandleMenu
    },
  });
  // Renders the editor instance.
  return <BlockNoteView editor = {editor}/>;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

Let's look at how this is done. We first need to create a custom Drag Handle Menu using a React component. This component should take the following props:

```typescript
type CustomDragHandleMenuProps = {
  editor: BlockNoteEditor;
  block: Block;
  closeMenu: () => void;
};
const CustomDragHandleMenu = (props: CustomDragHandleMenuProps): JSX.Element => ...;
```

You can then tell BlockNote to use your custom Drag Handle Menu using
the `customElements` option in `useBlockNote`:

```typescript
const editor = useBlockNote({
  customElements: {
    blockSideMenuFactory: CustomBlockSideMenu
  },
});
```

## Default Items

It might seem daunting to create your own Drag Handle Menu from scratch, which is why BlockNote provides React components for everything you see in the default layout - both the menu itself and the items in it. Below are all the default components you can use to build your custom menu:

```typescript
// Menu which wraps all the items.
type BlockSideMenuProps = {
  children: ReactNode
}
const BlockSideMenu = (props: BlockSideMenuProps) => ...;

// Button which removes the block.
type RemoveBlockButtonProps = {
  editor: BlockNoteEditor;
  block: Block;
  closeMenu: () => void;
  children: ReactNode;
};
const RemoveBlockButton = (props: RemoveBlockButtonProps) => ...;

// Button which opens a dropdown on hover. The dropdown lets you set the block's color.
type BlockColorsButtonProps = {
  editor: BlockNoteEditor;
  block: Block;
  closeMenu: () => void;
  children: ReactNode;
};
const BlockColorsButton = (props: BlockColorsButtonProps) => ...;
```

## Custom Items

BlockNote also provides components that you can use to make your own menu items, which match BlockNote's UI styling:

```typescript
// Also includes all props of button elements, e.g. onClick.
type DragHandleMenuItemProps = {
  // Closes the menu when called.
  closeMenu: () => void;
};
export const DragHandleMenuItem = (props: DragHandleMenuItemProps) => ...;
```