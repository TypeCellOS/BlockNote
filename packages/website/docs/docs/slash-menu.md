---
title: Slash Menu
description: The Slash Menu is the list of commands which shows up whenever you type the "/" (slash) character, or when you click the "+" button in the Side Menu.
imageTitle: Slash Menu
path: /docs/slash-menu
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Slash Menu

The Slash Menu is the list of commands which shows up whenever you type the "/" (slash) character, or when you click the "+" button in the [Side Menu](/docs/side-menu):

<img style="max-width:400px" :src="isDark ? '/img/screenshots/slash_menu_dark.png' : '/img/screenshots/slash_menu.png'" alt="image">

## Custom Slash Menu Item List

If you want to change the items that appear in the Slash Menu, you can do that using the `slashMenuItems` [editor option](/docs/editor#editor-options).

You can see how this is done in the example below, which has a custom Slash Menu item list. It includes all the default Slash Menu items, as well as a custom item, which inserts a new block below with "Hello World" in bold.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  ReactSlashMenuItem,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";
import { HiOutlineGlobeAlt } from "react-icons/hi";

// Command to insert "Hello World" in bold in a new block below.
const insertHelloWorld = (editor: BlockNoteEditor) => {
  // Block that the text cursor is currently in.
  const currentBlock: Block = editor.getTextCursorPosition().block;

  // New block we want to insert.
  const helloWorldBlock: PartialBlock = {
    type: "paragraph",
    content: [{ type: "text", text: "Hello World", styles: { bold: true } }],
  };

  // Inserting the new block after the current one.
  editor.insertBlocks([helloWorldBlock], currentBlock, "after");
};

// Custom Slash Menu item which executes the above function.
const insertHelloWorldItem: ReactSlashMenuItem = {
  name: "Insert Hello World",
  execute: insertHelloWorld,
  aliases: ["helloworld", "hw"],
  group: "Other",
  icon: <HiOutlineGlobeAlt size={18} />,
  hint: "Used to insert a block with 'Hello World' below.",
};

// List containing all default Slash Menu Items, as well as our custom one.
const customSlashMenuItemList = [
  ...getDefaultReactSlashMenuItems(),
  insertHelloWorldItem,
];

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    slashMenuItems: customSlashMenuItemList,
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

To find out how to get the default Slash Menu items, as well as how to make custom items, read on to [Slash Menu Items](/docs/slash-menu#slash-menu-items)

## Slash Menu Items

### Default Items

BlockNote comes with a variety of built-in Slash Menu items, which are used to change the type of the block containing the text cursor. If you don't pass anything to `slashMenuItems`, BlockNote will use these to set the Slash Menu contents.

If you want to change, remove & reorder the default items , you first import and copy them to a new array. From there, you can edit the array how you like, then pass it to `useBlockNote`:

```typescript
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  ReactSlashMenuItem,
  useBlockNote
} from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
  const newSlashMenuItems: ReactSlashMenuItem[] = 
    getDefaultReactSlashMenuItems();

  // Edit newSlashMenuItems
  ...

  const editor = useBlockNote({ slashMenuItems: newSlashMenuItems });

  return <BlockNoteView editor={editor} />;
}
```

### Custom Items

Creating a custom Slash Menu item is easy! Just declare a plain JavaScript object with the following fields:

```typescript
type SlashMenuItem = {
  name: string;
  execute: (editor: BlockNoteEditor) => void;
  aliases?: string[];
  group: string;
  icon: JSX.Element;
  hint?: string;
  shortcut?: string;
};
```

`name:` The item's name, which is the same string you see displayed in the menu, e.g. "Heading" or "Paragraph".

`execute:` A function that runs when the item is selected.

`aliases:` Other names for the item, used as shortcuts for search.

`group:` The name of the group the item belongs to, e.g. "Headings" or "Basic Blocks".

`icon:` The item's icon.

`hint:` A short phrase to describe what the item is for, which is displayed below its name.

`shortcuts:` A keyboard shortcut which can be used to run the item's `execute` function without the Slash Menu being open.
