---
title: Block Side Menu
description: The Block Side Menu appears whenever you hover over a block, and is used to drag & drop the block as well as add new ones below it.
imageTitle: Block Side Menu
path: /docs/side-menu
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils"; 
import {ref} from "vue"; 

const { isDark } = useData();
</script>

# Block Side Menu

The Block Side Menu appears whenever you hover over a block, and is used to drag & drop the block as well as add new ones below it.

<img style="max-width:500px" :src="isDark ? '/img/screenshots/side_menu_dark.png' : '/img/screenshots/side_menu.png'" alt="image">

You can also click the drag handle (`⠿`) in the Block Side Menu to open the Drag Handle Menu.

<img style="max-width:250px" :src="isDark ? '/img/screenshots/drag_handle_menu_dark.png' : '/img/screenshots/drag_handle_menu.png'" alt="image">

## Custom Side Menu

If you want to change the items in the Side Menu, or replace it altogether, you can do that using a React component.

You can see how this is done in the example below, which has a custom Side Menu with two items. The first one deletes the selected block, while the second one is a drag handle, which opens a menu on click.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  DragHandle,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenu,
  SideMenuButton,
  SideMenuPositioner,
  SideMenuProps,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";
import { MdDelete } from "react-icons/md";

const CustomSideMenu = (props: SideMenuProps) => (
  <SideMenu>
    <SideMenuButton>
      <MdDelete
        size={24}
        onClick={() => props.editor.removeBlocks([props.block])}
      />
    </SideMenuButton>
    <DragHandle {...props} />
  </SideMenu>
);

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} sideMenu={CustomSideMenu} />
    </BlockNoteView>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

`CustomSideMenu` is the component we use to replace the default Side Menu. You can see it's made up of a bunch of other components that are exported by BlockNote. Read on to [Components](/docs/side-menu#components) to find out more about these.

After creating `CustomSideMenu`, we tell BlockNote to use it inside `BlockNoteView`. [Changing UI Elements](/docs/ui-elements) has more information about how this is done.

## Custom Drag Handle Menu

If you want to change the items in the Drag Handle Menu, or replace it altogether, you can do that using a React component.

You can see how this is done in the example below, which has a custom Drag Handle Menu with two items. The first one deletes the selected block, while the second opens an alert.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { Block, BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  DefaultSideMenu,
  DragHandleMenu,
  DragHandleMenuItem,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  RemoveBlockButton,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";

const CustomDragHandleMenu = (props: {
  editor: BlockNoteEditor;
  block: Block;
}) => {
  return (
    <DragHandleMenu>
      {/*Default item to remove the block.*/}
      <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
      {/*Custom item which opens an alert when clicked.*/}
      <DragHandleMenuItem onClick={() => window.alert("Button Pressed!")}>
        Open Alert
      </DragHandleMenuItem>
    </DragHandleMenu>
  );
};

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner
        editor={editor}
        sideMenu={(props) => (
          <DefaultSideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
        )}
      />
    </BlockNoteView>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

`CustomDragHandleMenu` is the component we use to replace the default Drag Handle Menu. You can see it's made up of a bunch of other components that are exported by BlockNote. Read on to [Components](/docs/side-menu#components) to find out more about these.

Here, we're passing it as a prop to the `DefaultSideMenu` component, but you can also pass it to the `DragHandle` component we saw in the [previous demo](/docs/side-menu#custom-side-menu), if you don't want to use the default Side Menu layout.

After creating `CustomDragHandleMenu`, we tell BlockNote to use it inside `BlockNoteView`. [Changing UI Elements](/docs/ui-elements) has more information about how this is done.

## Components

BlockNote provides React components that you can reuse, to easily create your menus while matching the default styling.

### Default Components

BlockNote exports all components used to create the default layout - both the menu itself and the items in it. Head to the [default Side Menu's source code](https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/SideMenu/components/DefaultSideMenu.tsx) and [default Drag Handle Menu's source code](https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/SideMenu/components/DragHandleMenu/DefaultDragHandleMenu.tsx) to see all the components that you can use.

### Custom Components

BlockNote also provides components that you can use to make your own menu items, which also match the default styling:

```typescript
type SideMenuButtonProps = {
  children: JSX.Element;
}
export const SideMenuButton = (props: SideMenuButtonProps) => ...;

// Takes same props as `button` elements, e.g. onClick.
export const DragHandleMenuItem = (props) => ...;
```
