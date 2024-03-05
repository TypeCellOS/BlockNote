---
title: Markdown & HTML
description: It's possible to export or import Blocks to and from Markdown and HTML.
imageTitle: Markdown & HTML
path: /docs/converting-blocks
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Markdown & HTML

It's possible to export or import Blocks to and from Markdown and HTML.

::: warning
The functions to import/export to and from Markdown/HTML are considered "lossy"; some information might be dropped when you export Blocks to those formats.

To serialize Blocks to a non-lossy format (for example, to store the contents of the editor in your backend), simply export the built-in Block format using `JSON.stringify(editor.topLevelBlocks)`.
:::

## Markdown

BlockNote can import / export Blocks to and from Markdown. Note that this is also considered "lossy", as not all structures can be entirely represented in Markdown.

### Converting Blocks to Markdown

`Block` objects can be serialized to a Markdown string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public blocksToMarkdownLossy(blocks: Block[]): string;
...
}

// Usage
const markdownFromBlocks = editor.blocksToMarkdownLossy(blocks);
```

`returns:` The blocks, serialized as a Markdown string.

The output is simplified as Markdown does not support all features of BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.

**Demo**

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor) => {
      // Converts the editor's contents from Block objects to Markdown and
      // saves them.
      const saveBlocksAsMarkdown = async () => {
        const markdown: string =
          await editor.blocksToMarkdownLossy(editor.topLevelBlocks);
        setMarkdown(markdown);
      };
      saveBlocksAsMarkdown();
    }
  });

  // Renders the editor instance, and its contents as Markdown below.
  return (
    <div>
      <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />
      <pre>{markdown}</pre>
    </div>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

pre {
  color: gray;
  white-space: pre-wrap;
}
```

:::

### Parsing Markdown to Blocks

`Block` objects can be parsed from a Markdown string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public tryParseMarkdownToBlocks(markdown: string): Blocks[];
...
}

// Usage
const blocksFromMarkdown = editor.tryParseMarkdownToBlocks(markdown);
```

`returns:` The blocks parsed from the Markdown string.

Tries to create `Block` and `InlineNode` objects based on Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it as text.

**Demo**

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { useEffect, useState } from "react";
import { BlockNoteEditor, Block } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the current Markdown content.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Makes the editor non-editable.
    editable: false
  })

  useEffect(() => {
    if (editor) {
      // Whenever the current Markdown content changes, converts it to an array
      // of Block objects and replaces the editor's content with them.
      const getBlocks = async () => {
        const blocks: Block[] = await editor.tryParseMarkdownToBlocks(markdown);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      };
      getBlocks();
    }
  }, [editor, markdown]);

  // Renders a text area for you to write/paste Markdown in, and the editor
  // instance below, which displays the current Markdown as blocks.
  return (
    <div>
      <textarea
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
      />
      <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />
    </div>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

textarea {
  color: gray;
  background-color: {{ isDark ? "#151515" : "white" }};
  width: 100%;
  height: 100%;
}
```

:::

## HTML

We expose functions to convert Blocks to and from HTML. Converting Blocks to HTML will lose some information such as the nesting of nodes in order to export a simple HTML structure.

### Converting Blocks to HTML

`Block` objects can be exported to an HTML string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public blocksToHTMLLossy(blocks: Block[]): string;
...
}

// Usage
const HTMLFromBlocks = editor.blocksToHTMLLossy(blocks);
```

`returns:` The blocks, exported to an HTML string.

To better conform to HTML standards, children of blocks which aren't list items are un-nested in the output HTML.

**Demo**

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the editor's contents as HTML.
  const [html, setHTML] = useState<string>("");

  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor) => {
      // Converts the editor's contents from Block objects to HTML and saves
      // them.
      const saveBlocksAsHTML = async () => {
        const html: string = await editor.blocksToHTMLLossy(editor.topLevelBlocks);
        setHTML(html);
      };
      saveBlocksAsHTML();
    }
  });

  // Renders the editor instance, and its contents as HTML below.
  return (
    <div>
      <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />
      <pre>{html}</pre>
    </div>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

pre {
  color: gray;
  white-space: pre-wrap;
}
```

:::

### Parsing HTML to Blocks

`Block` objects can be parsed from an HTML string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public tryParseHTMLToBlocks(html: string): Blocks[];
...
}

// Usage
const blocksFromHTML = editor.tryParseHTMLToBlocks(html);
```

`returns:` The blocks parsed from the HTML string.

Tries to create `Block` objects out of any HTML block-level elements, and `InlineNode` objects from any HTML inline elements, though not all HTML tags are recognized. If BlockNote doesn't recognize an element's tag, it will parse it as a paragraph or plain text.

**Demo**

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { useEffect, useState } from "react";
import { BlockNoteEditor, Block } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the current HTML content.
  const [html, setHTML] = useState<string>("");

  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Makes the editor non-editable.
    editable: false
  })

  useEffect(() => {
    if (editor) {
      // Whenever the current HTML content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const getBlocks = async () => {
        const blocks: Block[] = await editor.tryParseHTMLToBlocks(html);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      };
      getBlocks();
    }
  }, [editor, html]);

  // Renders a text area for you to write/paste HTML in, and the editor instance
  // below, which displays the current HTML as blocks.
  return (
    <div>
      <textarea
        value={html}
        onChange={(event) => setHTML(event.target.value)}
      />
      <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />
    </div>
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

textarea {
  color: gray;
  background-color: {{ isDark ? "#151515" : "white" }};
  width: 100%;
  height: 100%;
}
```

:::
