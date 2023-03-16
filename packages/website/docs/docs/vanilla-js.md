# Usage Without React (Vanilla JS)

BlockNote is mainly designed as a quick and easy drop-in block-based editor for React apps. It comes with built-in UI elements that are designed for React.

It is also possible to use BlockNote without using React; for example in "Vanilla JS" applications or if you prefer to use a different framework. However, this does involve writing your own UI elements.

::: warning
We recommend using BlockNote with React so you can use the built-in UI components. This document will explain how you can use BlockNote without React, and write your own components, but this is not recommended as you'll lose the easy-to-use built-in components. The API for non-React applications is also likely to change.
:::

## Installing

Instead of `@blocknote/react`, you'll need to install and use `@blocknote/core`.

## Creating an editor

This is how to create a new BlockNote editor:

```
import { BlockNoteEditor } from "@blocknote/core";
const editor = new BlockNoteEditor({
  element: document.getElementById("root")!, // element to append the editor to
  onUpdate: ({ editor }) => {
    console.log(editor.getJSON());
  }
});
```

Now, you'll have a plain BlockNote instance on your page. However, it's missing some menu's and other UI elements.

## Creating your own UI elements

Because we can't use the built-in React elements, you'll need to create and register your own UI elements for the following BlockNote components:

- Slash menu
- Formatting toolbar
- Side menu (block handle)
- Hyperlink menu

You can do this by passing custom component factories as `uiFactories`, e.g.:

```
const editor = new BlockNoteEditor({
  element: document.getElementById("root")!,
  uiFactories: {
    formattingToolbarFactory: customFormattingToolbarFactory,
    hyperlinkToolbarFactory: customHyperlinkToolbarFactory,
    slashMenuFactory: customSlashMenuFactory,
    blockSideMenuFactory: customBlockSideMenuFactory,
  }
});
```

## Example

For an example of a how to set up your custom UI factories, see the [Vanilla JS example](https://github.com/TypeCellOS/BlockNote/blob/main/examples/vanilla/) in the repository.
