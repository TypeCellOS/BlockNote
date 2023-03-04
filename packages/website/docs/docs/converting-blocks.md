# Converting Blocks to and from other formats

It's possible to export Blocks to other formats, or import Blocks from other formats.

::: warning
The functions to import / export to and from HTML / Markdown are considered "lossy"; some information might be dropped when you export Blocks to those formats.

To serialize Blocks to a non-lossy format (for example, to store the contents of the editor in your backend), simply export the built in Block format using `JSON.stringify(editor.allBlocks)`.
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

**Example**

TODO

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

This function will try to create `Block` objects out of any HTML block-level elements, and`InlineNode` objects from any HTML inline elements, though not all types of elements are recognized. If BlockNote doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.

**Example**

TODO

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

Some features of blocks can't be represented using Markdown, such as block color or text alignment, so some information is lost from the conversion:

1. All blocks, except ones inside list items, are no longer nested since Markdown doesn't support nesting for them.
2. Underline, text color, and background color styles are removed as Markdown doesn't support them.

**Example**

TODO

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

This function will try to create `Block` objects and `InlineNode` objects based on the Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it as text.

**Example**

TODO
