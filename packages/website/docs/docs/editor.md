# Customizing the Editor

While you can get started with BlockNote in minutes, it's likely that you'll want to customize its features and functionality to better suit your app.

## Editor Options

There are a number of options that you can pass to `useBlockNote()`, which you can use to customize the editor. You can find the full list of these below:

```typescript
export type BlockNoteEditorOptions = {
  initialContent: PartialBlock[];
  editorDOMAttributes: Record<string, string>;
  onEditorReady: (editor: BlockNoteEditor) => void;
  onEditorContentChange: (editor: BlockNoteEditor) => void;
  onTextCursorPositionChange: (editor: BlockNoteEditor) => void;
  slashMenuItems: ReactSlashMenuItem[];
  uiFactories: UiFactories;
};
```

`initialContent:` The content that should be in the editor when it's created, represented as an array of [partial block objects](/docs/manipulating-blocks#partial-blocks).

`editorDOMAttributes:` An object containing attributes that should be added to the editor's HTML element.

`onEditorReady:` A callback function that runs when the editor is ready to be used.

`onEditorContentChange:` A callback function that runs whenever the editor's contents change.

`onTextCursorPositionChange:` A callback function that runs whenever the text cursor position changes. Head to [Text Cursor](/docs/cursor-selections#text-cursor) to see how you can make use of this.

`slashMenuItems:` The commands that are listed in the editor's [Slash Menu](/docs/slash-menu). If this option isn't defined, a default list of commands is loaded.

`uiFactories:` Factories used to create a custom UI for BlockNote, which you can find out more about in [Creating Your Own UI Elements](/docs/vanilla-js#creating-your-own-ui-elements).

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