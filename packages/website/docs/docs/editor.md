---
title: Customizing the Editor
description: While you can get started with BlockNote in minutes, it's likely that you'll want to customize its features and functionality to better suit your app.
imageTitle: Customizing the Editor
path: /docs/editor
---

# Customizing the Editor

While you can get started with BlockNote in minutes, it's likely that you'll
want to customize its features and functionality to better suit your app.

## Editor Options

There are a number of options that you can pass to `useBlockNote()`, which you
can use to customize the editor. You can find the full list of these below:

```typescript
export type BlockNoteEditorOptions = Partial<{
  editable: boolean;
  initialContent: PartialBlock[];
  editorDOMAttributes: Record<string, string>;
  onEditorReady: (editor: BlockNoteEditor) => void;
  onEditorContentChange: (editor: BlockNoteEditor) => void;
  onTextCursorPositionChange: (editor: BlockNoteEditor) => void;
  slashMenuItems: ReactSlashMenuItem[];
  customElements: CustomElements;
  uiFactories: UiFactories;
  defaultStyles: boolean;
  theme: "light" | "dark";
}>;
```

`editable:` Locks the editor from being editable by the user if set to `false`. [Editor Functions](/docs/blocks#editor-functions) will still work.

`initialContent:` The content that should be in the editor when it's created, represented as an array of [partial block objects](/docs/manipulating-blocks#partial-blocks).

`editorDOMAttributes:` An object containing attributes that should be added to the editor's HTML element. For example, you can pass `{ class: "my-editor-class" }` to set a custom class name.

`onEditorReady:` A callback function that runs when the editor is ready to be used.

`onEditorContentChange:` A callback function that runs whenever the editor's contents change.

`onTextCursorPositionChange:` A callback function that runs whenever the text cursor position changes. Head to [Text Cursor](/docs/cursor-selections#text-cursor) to see how you can make use of this.

`slashMenuItems:` The commands that are listed in the editor's [Slash Menu](/docs/slash-menu). If this option isn't defined, a default list of commands is loaded.

`customElements:` React components for a custom [Formatting Toolbar](/docs/formatting-toolbar#custom-formatting-toolbar) and/or [Drag Handle Menu](/docs/side-menu#custom-drag-handle-menu) to use.

`uiFactories:` UI element factories for creating a custom UI, including custom positioning & rendering. You can find out more about UI factories in [Creating Your Own UI Elements](/docs/vanilla-js#creating-your-own-ui-elements).

`defaultStyles`: Whether to use the default font and reset the styles of `<p>`, `<li>`, `<h1>`, etc. elements that are used in BlockNote. Defaults to true if undefined.

`theme:` Whether to use the light or dark theme.

## Demo: Saving & Restoring Editor Contents

By default, BlockNote doesn't preserve the editor contents when your app is reopened or refreshed. However, using the editor options, you can change this by using the editor options.

In the example below, we use the `onEditorContentChange` option to save the editor contents in local storage whenever they change, then pass them to `initialContent` whenever the page is reloaded.

::: sandbox {template=react-ts}

```typescript /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

// Gets the previously stored editor contents.
const initialContent: string | null = localStorage.getItem("editorContent");

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    // If the editor contents were previously saved, restores them.
    initialContent: initialContent ? JSON.parse(initialContent) : undefined,
    // Serializes and saves the editor contents to local storage.
    onEditorContentChange: (editor) => {
      localStorage.setItem(
        "editorContent",
        JSON.stringify(editor.topLevelBlocks)
      );
    }
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
```

:::
