# Customizing the editor

This page will explain the options we can pass to `useBlockNote`.

There are a number of options that you can pass to `useBlockNote()`, which you can use to customize the editor. You can find the full list of these below:

```typescript
export type BlockNoteEditorOptions = {
  editorDOMAttributes: Record<string, string>;
  onCreate: (editor: BlockNoteEditor) => void;
  onUpdate: (editor: BlockNoteEditor) => void;
  slashMenuItems: ReactSlashMenuItem[];
  uiFactories: UiFactories;
};
```

`editorDOMAttributes:` An object containing attributes that should be added to the editor's HTML element.

`onCreate:` A callback function that runs when the editor is ready to be used.

`onUpdate:` A callback function that runs whenever the editor's contents change.

`slashMenuItems:` The commands that are listed in the editor's [Slash Menu](slash-menu.md). If this option isn't defined, a default list of commands is loaded.

`uiFactories:` Factories used to create a custom UI for BlockNote, which you can find out more about in [Creating Your Own UI Elements](vanilla-js#creating-your-own-ui-elements).