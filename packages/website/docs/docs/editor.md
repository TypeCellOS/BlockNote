# Customizing the Editor

There are a number of options that you can pass to `useBlockNote()`, which you can use to customize the editor. You can find the full list of these below:

```typescript
export type BlockNoteEditorOptions = {
  editorDOMAttributes: Record<string, string>;
  onEditorReady: (editor: BlockNoteEditor) => void;
  onEditorContentChange: (editor: BlockNoteEditor) => void;
  onTextCursorPositionChange: (editor: BlockNoteEditor) => void;
  slashMenuItems: ReactSlashMenuItem[];
  uiFactories: UiFactories;
};
```

`editorDOMAttributes:` An object containing attributes that should be added to the editor's HTML element.

`onEditorReady:` A callback function that runs when the editor is ready to be used.

`onEditorContentChange:` A callback function that runs whenever the editor's contents change.

`onTextCursorPositionChange:` A callback function that runs whenever the text cursor position changes. Head to [Text Cursor](/docs/cursor-selections#text-cursor) to see how you can make use of this.

`slashMenuItems:` The commands that are listed in the editor's [Slash Menu](/docs/slash-menu). If this option isn't defined, a default list of commands is loaded.

`uiFactories:` Factories used to create a custom UI for BlockNote, which you can find out more about in [Creating Your Own UI Elements](/docs/vanilla-js#creating-your-own-ui-elements).