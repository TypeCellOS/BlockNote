# Markdown & HTML

It's possible to export or import Blocks to and from Markdown and HTML.

::: warning
The functions to import/export to and from Markdown/HTML are considered "lossy"; some information might be dropped when you export Blocks to those formats.

To serialize Blocks to a non-lossy format (for example, to store the contents of the editor in your backend), simply export the built-in Block format using `JSON.stringify(editor.allBlocks)`.
:::

## Markdown

BlockNote can import / export Blocks to and from Markdown. Note that this is also considered "lossy", as not all structures can be entirely represented in Markdown.

### Converting Blocks to Markdown

`Block` objects can be serialized to a Markdown string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public blocksToMarkdown(blocks: Block[]): string;
...
}

// Usage
const markdownFromBlocks = editor.blocksToMarkdown(blocks);
```

`returns:` The blocks, serialized as a Markdown string.

The output is simplified as Markdown does not support all features of BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.

**Demo**

::: sandbox {template=react-ts}

```typescript /App.tsx
import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string | null>(null);

  // Creates a new editor instance.
  const editor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor: BlockNoteEditor) => {
      // Converts the editor's contents from Block objects to Markdown and 
      // saves them.
      const saveBlocksAsMarkdown = async () => {
        const markdown = await editor.blocksToMarkdown(editor.topLevelBlocks);
        setMarkdown(markdown);
      };
      saveBlocksAsMarkdown();
    }
  });
  
  // Renders a BlockNote editor, and its contents as Markdown below.
  return (
    <div>
      <BlockNoteView editor={editor} />
      <pre style={{ whiteSpace: "pre-wrap" }}>{markdown}</pre>
    </div>
  );
}
```

:::

### Converting Markdown to Blocks

`Block` objects can be parsed from a Markdown string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public markdownToBlocks(markdown: string): Blocks[];
...
}

// Usage
const blocksFromMarkdown = editor.markdownToBlocks(markdown);
```

`returns:` The blocks parsed from the Markdown string.

Tries to create `Block` and `InlineNode` objects based on Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it as text.

**Demo**

::: sandbox {template=react-ts}

```typescript /App.tsx
import { useEffect, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    // Makes the editor non-editable.
    _tiptapOptions: {
      editable: false,
    },
  })

  // Stores the current Markdown content.
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    if (editor) {
      // Whenever the current Markdown content changes, converts it to an array
      // of Block objects and replaces the editor's content with them.
      const getBlocks = async () => {
        const blocks = await editor.markdownToBlocks(markdown);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      };
      getBlocks();
    }
  }, [editor, markdown]);

  // Renders a text area for you to write/paste Markdown in and a BlockNote
  // editor below, which displays the current Markdown as blocks.
  return (
    <div>
      <textarea
        style={{ width: "100%", height: "100px" }}
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
      />
      <BlockNoteView editor={editor} />
    </div>
  );
}
```

:::

## HTML

We expose functions to convert Blocks to and from HTML. Converting Blocks to HTML will lose some information such as the nesting of nodes in order to export a simple HTML structure.

### Converting Blocks to HTML

`Block` objects can be serialized to an HTML string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public blocksToHTML(blocks: Block[]): string;
...
}

// Usage
const HTMLFromBlocks = editor.blocksToHTML(blocks);
```

`returns:` The blocks, serialized as an HTML string.

To better conform to HTML standards, children of blocks which aren't list items are un-nested in the output HTML.

**Demo**

::: sandbox {template=react-ts}

```typescript /App.tsx
import { useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Stores the editor's contents as HTML.
  const [html, setHTML] = useState<string | null>(null);

  // Creates a new editor instance.
  const editor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor: BlockNoteEditor) => {
      // Converts the editor's contents from Block objects to HTML and saves 
      // them.
      const saveBlocksAsHTML = async () => {
        const html = await editor.blocksToHTML(editor.topLevelBlocks);
        setHTML(html);
      };
      saveBlocksAsHTML();
    }
  });

  // Renders a BlockNote editor, and its contents as HTML below.
  return (
    <div>
      <BlockNoteView editor={editor} />
      <pre style={{ whiteSpace: "pre-wrap" }}>{html}</pre>
    </div>
  );
}
```

:::

### Converting HTML to Blocks

`Block` objects can be parsed from an HTML string using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public HTMLToBlocks(html: string): Blocks[];
...
}

// Usage
const blocksFromHTML = editor.HTMLToBlocks(html);
```

`returns:` The blocks parsed from the HTML string.

Tries to create `Block` objects out of any HTML block-level elements, and `InlineNode` objects from any HTML inline elements, though not all HTML tags are recognized. If BlockNote doesn't recognize an element's tag, it will parse it as a paragraph or plain text.

**Demo**

::: sandbox {template=react-ts}

```typescript /App.tsx
import { useEffect, useState } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    // Makes the editor non-editable.
    _tiptapOptions: {
      editable: false,
    },
  })

  // Stores the current HTML content.
  const [html, setHTML] = useState<string>("");

  useEffect(() => {
    if (editor) {
      // Whenever the current HTML content changes, converts it to an array of 
      // Block objects and replaces the editor's content with them.
      const getBlocks = async () => {
        const blocks = await editor.HTMLToBlocks(html);
        editor.replaceBlocks(editor.topLevelBlocks, blocks);
      };
      getBlocks();
    }
  }, [editor, html]);

  // Renders a text area for you to write/paste HTML in and a BlockNote editor 
  // below, which displays the current HTML as blocks.
  return (
    <div>
      <textarea
        style={{ width: "100%", height: "100px" }}
        value={html}
        onChange={(event) => setHTML(event.target.value)}
      />
      <BlockNoteView editor={editor} />
    </div>
  );
}
```

:::