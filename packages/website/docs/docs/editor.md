---
title: Customizing the Editor
description: While you can get started with BlockNote in minutes, it's likely that you'll want to customize its features and functionality to better suit your app.
imageTitle: Customizing the Editor
path: /docs/editor
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

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
  defaultStyles: boolean;
}>;
```

`editable:` Locks the editor from being editable by the user if set to `false`. [Editor Functions](/docs/blocks#editor-functions) will still work.

`initialContent:` The content that should be in the editor when it's created, represented as an array of [partial block objects](/docs/manipulating-blocks#partial-blocks).

`domAttributes:` An object containing HTML attributes that should be added to various DOM elements in the editor. See [Adding DOM Attributes](/docs/theming#adding-dom-attributes) for more.

`onEditorReady:` A callback function that runs when the editor is ready to be used.

`onEditorContentChange:` A callback function that runs whenever the editor's contents change.

`onTextCursorPositionChange:` A callback function that runs whenever the text cursor position changes. Head to [Text Cursor](/docs/cursor-selections#text-cursor) to see how you can make use of this.

`slashMenuItems:` The commands that are listed in the editor's [Slash Menu](/docs/slash-menu). If this option isn't defined, a default list of commands is loaded.

`defaultStyles`: Whether to use the default font and reset the styles of `<p>`, `<li>`, `<h1>`, etc. elements that are used in BlockNote. Defaults to true if undefined.
