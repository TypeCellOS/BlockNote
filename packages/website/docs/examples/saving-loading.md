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

# Saving & Loading

In this example, we save the editor contents to local storage whenever a change is made, and load the saved contents when the editor is created.

See this in action by typing in the editor and reloading the page!

**Relevant Docs:**

- [Editor Options](/docs/editor#editor-options)
- [Accessing Blocks](/docs/manipulating-blocks#accessing-blocks)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

// Gets the previously stored editor contents.
const initialContent: string | null = localStorage.getItem("editorContent");

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
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
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::