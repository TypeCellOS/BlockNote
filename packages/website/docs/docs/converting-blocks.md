# Converting Blocks to and from other formats

This page will explain:

- how to import / export from HTML / markdown
- how these conversions are "lossy"

## Converting Blocks To & From HTML

If you need to describe blocks using HTML instead `Block` objects, BlockNote makes it easy to convert between the two formats.

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

The HTML from this function is different to what you'll see rendered in the browser by BlockNote in order to better comply with HTML standards:

1. HTML `div` elements used to structure blocks are removed. This also removes the block's properties.
2. All blocks except those inside list item blocks are no longer nested, since there are no more block structuring `div` elements to nest them in.
3. Content from list item blocks is wrapped in `ul`/`ol` and `li` elements.

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

This function will try to create `Block` objects out of any HTML block-level elements, and`InlineNode` objects from any HTML inline elements, though not all types of elements are recognized. If BlockNote doesn't recognize an HTML element's tag, it will parse it as a paragraph or text.

**Example**

TODO

## Converting Blocks To & From Markdown

If you need to describe blocks using Markdown rather than `Block` objects, BlockNote provides editor functions for converting between them.

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

1. All block structure is removed, only type and content are kept.
2. All blocks, except ones inside list items, are no longer nested since Markdown doesn't support nesting for them.
3. Underline, text color, and background color styles are removed as Markdown doesn't support them.

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