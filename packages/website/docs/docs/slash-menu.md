# Slash Menu

The Slash Menu is the list of commands which shows up whenever you type the "/" (slash) character, or when you click the "+" button in the [Side Menu](side-menu.md):

<!-- ![../public/img/screenshots/slash_menu.png]() -->

<img style="max-width:400px" src="../public/img/screenshots/slash_menu.png" alt="image">

## Slash Menu Items

In the options passed to `useBlockNote`, there's a field:

`slashMenuItems: ReactSlashMenuItem[]`

Which you can use to customize the contents of the Slash Menu. Let's take a look at what's in a `ReactSlashMenuItem`:

```typescript
type ReactSlashMenuItem = {
  name: string;
  execute: (editor: BlockNoteEditor) => void;
  aliases: string[];
  group: string;
  hint?: string;
  shortcut?: string;
};
```

`name:` The item's name, which is the same string you see displayed in the menu, e.g. "Heading" or "Paragraph".

`execute:` A function that runs when the item is selected.

`aliases:` Other names for the item, which as used as shortcuts for search.

`group:` The name of the group the item belongs to, e.g. "Headings" or "Basic Blocks".

`hint:` A short phrase to describe what the item is for, which is displayed below its name.

`shortcuts:` A keyboard shortcut which can be used to run the item's `execute` function outside the Slash Menu.

## Default Items

BlockNote comes with the following Slash Menu items:

```typescript
const defaultSlashMenuItems: ReactSlashMenuItem[] = [
  {
    name: "Heading",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // heading 1.
    ...
    },
    aliases: ["h", "heading1", "h1"],
    group: "Headings",
    hint: "Used for a top-level heading",
    shortcut: "Mod-Alt-1" // Mod is Cmd or Ctrl depending on OS.
  },
  {
    name: "Heading 2",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // heading 2.
    ...
    },
    aliases: ["h2", "heading2", "subheading"],
    group: "Headings",
    hint: "Used for key sections",
    shortcut: "Mod-Alt-2" // Mod is Cmd or Ctrl depending on OS.
  },
  {
    name: "Heading 3",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // heading 3.
    ...
    },
    aliases: ["h3", "heading3", "subheading"],
    group: "Headings",
    hint: "Used for subsections and group headings",
    shortcut: "Mod-Alt-3" // Mod is Cmd or Ctrl depending on OS.
  },
  {
    name: "Numbered List",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // numbered list item.
    ...
    },
    aliases: ["li", "list", "numberedlist", "numbered list"],
    group: "Basic blocks",
    hint: "Used to display a numbered list",
    shortcut: "Mod-Alt-7" // Mod is Cmd or Ctrl depending on OS.
  },
  {
    name: "Bullet List",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // numbered list item.
    ...
    },
    aliases: ["ul", "list", "bulletlist", "bullet list"],
    group: "Basic blocks",
    hint: "Used to display an unordered list",
    shortcut: "Mod-Alt-9" // Mod is Cmd or Ctrl depending on OS.
  },
  {
    name: "Paragraph",
    execute: (editor: BlockNoteEditor) => {
      // Changes the type of the block containing the text cursor to a
      // numbered list item.
    ...
    },
    aliases: ["p"],
    group: "Basic blocks",
    hint: "Used for the body of your document",
    shortcut: "Mod-Alt-0" // Mod is Cmd or Ctrl depending on OS.
  },
]
```

## Customizing the Default Items

If you don't pass anything to `slashMenuItems`, BlockNote will use `defaultSlashMenuItems` to set the Slash Menu contents. If you want to change, remove & reorder the default items though, you first import and copy them to a new array. From there, you can edit your array how you like, then pass it to `useBlockNote`:

```typescript
import { defaultSlashMenuItems } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
  const newSlashMenuItems: ReactSlashMenuItem[] = defaultSlashMenuItems;

  // Edit newSlashMenuItems
  ...

  const editor = useBlockNote({ slashMenuItems: newSlashMenuItems });

  return <BlockNoteView editor={editor} />;
}
```
