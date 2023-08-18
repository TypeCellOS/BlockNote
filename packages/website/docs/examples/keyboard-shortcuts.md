---
title: Keyboard Shortcuts
description: In this example, we create a keyboard shortcut which cycles the current block type.
imageTitle: Keyboard Shortcuts
path: /examples/removing-default-blocks
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Keyboard Shortcuts

In this example, we create a keyboard shortcut which cycles the current block type when Ctrl+G is pressed.

**Relevant Docs:**

- [Editor Options](/docs/editor#editor-options)
- [Text Cursor](/docs/cursor-selections#text-cursor)
- [Updating Blocks](/docs/manipulating-blocks#updating-blocks)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { Block, BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

const cycleBlocksShortcut = (event: KeyboardEvent, editor: BlockNoteEditor) => {
  // Checks for Ctrl+G shortcut
  if (event.ctrlKey && event.key === "g") {
    // Needs type cast as Object.keys doesn't preserve type
    const allBlockTypes: Block["type"][] = Object.keys(
      editor.schema
    ) as Block["type"][];

    const currentBlockType: Block["type"] =
      editor.getTextCursorPosition().block.type;

    const nextBlockType: Block["type"] =
      allBlockTypes[
        (allBlockTypes.indexOf(currentBlockType) + 1) % allBlockTypes.length
      ];

    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: nextBlockType,
    });
  }
};

export default function App() {
  const editor: BlockNoteEditor = useBlockNote({
    // Adds event handler on key down when the editor is ready
    onEditorReady: (editor) =>
      editor.domElement.addEventListener("keydown", (event) =>
        cycleBlocksShortcut(event, editor)
      ),
  });

  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}

```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::
