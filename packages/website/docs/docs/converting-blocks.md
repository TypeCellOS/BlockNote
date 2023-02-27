# Converting Blocks to and from other formats

This page will explain:

- how to import / export from HTML / markdown
- how these conversions are "lossy"

## Converting Blocks To & From HTML

If you need to describe blocks using HTML rather than `Block` objects, the BlockNote API provides functions for converting between the two formats.

### Converting Blocks to HTML

`Block` objects can be serialized to an HTML string using the following API function:

```typescript
// Definition
class BlockNoteAPI {
...
  public blocksToHTML(blocks: Block[]): string;
...
}

// Usage
const HTMLFromBlocks = editorAPI.blocksToHTML(blocks);
```

The HTML obtained from this function is different to what's rendered in the browser by BlockNote to better comply with HTML standards, which causes some information to be lost. This results in a number of differences:

1. HTML `div` elements used to create the block structure are removed to ease parsing the output HTML outside BlockNote. This also removes changes in appearance caused by the block's properties.
2. All blocks except those inside list item blocks are no longer nested, as the block structuring `div` elements have been removed, and most HTML text elements, such as `p` elements, don't support nesting.
3. List item blocks are wrapped in corresponding `ul`/`ol` and `li` elements.

**Example**

TODO

### Converting HTML to Blocks

`Block` objects can be parsed from an HTML string using the following API function:

```typescript
// Definition
class BlockNoteAPI {
...
  public HTMLToBlocks(html: string): Blocks[];
...
}

// Usage
const blocksFromHTML = editorAPI.HTMLToBlocks(html);
```

This function preserves all information from the HTML string that can be represented in BlockNote. This means BlockNote will try to create `Block` objects out of any HTML block-level elements, and determine their type based on the tag. Additionally, it'll try to create `StyledText` objects from any HTML inline elements. It also preserves all nesting.

**Example**

TODO

## Converting Blocks To & From Markdown

If you need to describe blocks using Markdown rather than `Block` objects, the BlockNote API also provides functions for converting between them.

### Converting Blocks to Markdown

`Block` objects can be serialized to a Markdown string using the following API function:

```typescript
// Definition
class BlockNoteAPI {
...
  public blocksToMarkdown(blocks: Block[]): string;
...
}

// Usage
const markdownFromBlocks = editorAPI.blocksToMarkdown(blocks);
```

The Markdown obtained from this function does not preserve all information provided in the `Block` objects due to the inherent limitations of Markdown. This results in a number of features being lost:

1. All block structure is removed, as Markdown has no way of encoding that. This also removes changes in appearance caused by the block's properties.
2. All blocks except those inside list item blocks are no longer nested, as Markdown only supports nesting for list items.
3. Underline, text color, and background color styles are removed as Markdown has no support for them.

**Example**

TODO

### Converting Markdown to Blocks

`Block` objects can be parsed from a Markdown string using the following API function:

```typescript
// Definition
class BlockNoteAPI {
...
  public markdownToBlocks(markdown: string): Blocks[];
...
}

// Usage
const blocksFromMarkdown = editorAPI.markdownToBlocks(markdown);
```

This function preserves all information from the Markdown string that can be represented in BlockNote. This means will try to `Block` objects and `StyledText` objects based on the syntax. It also preserves list item nesting.

**Example**

TODO