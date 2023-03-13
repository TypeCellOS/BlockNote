# Converting Blocks to and from other formats

It's possible to export Blocks to other formats, or import Blocks from other formats.

::: warning
The functions to import / export to and from HTML / Markdown are considered "lossy"; some information might be dropped when you export Blocks to those formats.

To serialize Blocks to a non-lossy format (for example, to store the contents of the editor in your backend), simply export the built-in Block format using `JSON.stringify(editor.allBlocks)`.
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

`returns:` The blocks parsed from the HTML string.

Tries to create `Block` objects out of any HTML block-level elements, and `InlineNode` objects from any HTML inline elements, though not all HTML tags are recognized. If BlockNote doesn't recognize an element's tag, it will parse it as a paragraph or plain text.

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

`returns:` The blocks, serialized as a Markdown string.

The output is simplified as Markdown does not support all features of BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.

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

`returns:` The blocks parsed from the Markdown string.

Tries to create `Block` and `InlineNode` objects based on Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it as text.

**Example**

TODO
