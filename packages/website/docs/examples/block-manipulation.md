---
title: Alert Block
description: In this example, we create a custom Alert block which is used to emphasize text.
imageTitle: Alert Block
path: /examples/alert-block
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Block Manipulation

In this example, we create 4 buttons under the editor to manipulate the currently selected block.

**Relevant Docs:**

- [Block Manipulation](/docs/manipulating-blocks)
- [Text Cursor](/docs/cursor-selections#text-cursor)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

export default function App() {
  const editor: BlockNoteEditor = useBlockNote();

  return (
    <div>
      <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />
      {/*Inserts a new block below the currently selected block.*/}
      <button
        onClick={() =>
          editor.insertBlocks(
            [{ content: "This block was inserted!" }],
            editor.getTextCursorPosition().block,
            "after"
          )
        }>
        Insert
      </button>
      {/*Updates the currently selected block*/}
      <button
        onClick={() =>
          editor.updateBlock(editor.getTextCursorPosition().block, {
            content: "This block was updated!",
          })
        }>
        Update
      </button>
      {/*Removes the currently selected block*/}
      <button
        onClick={() =>
          editor.removeBlocks([editor.getTextCursorPosition().block])
        }>
        Remove
      </button>
      {/*Replaces the currently selected block*/}
      <button
        onClick={() =>
          editor.replaceBlocks(
            [editor.getTextCursorPosition().block],
            [
              {
                content: "This block was replaced!",
              },
            ]
          )
        }>
        Replace
      </button>
    </div>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::