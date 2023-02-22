# Converting Blocks to and from other formats

This page will explain:

- how to import / export from HTML / markdown
- how these conversions are "lossy"

## Converting Blocks To & From HTML

### Converting Blocks to HTML

`Block` objects can be converted an HTML string using the following API call:

```
editor.blocksToHTML(blocks: Block[]): string
```

The HTML obtained from this function is different to what's rendered in the browser by BlockNote to better comply with HTML standards, which causes some information to be lost. This results in a number of differences:

1. HTML `div` elements used to create the block structure are removed to ease parsing the output HTML outside BlockNote. This also removes changes in appearance caused by the block's properties.
2. All blocks except those inside list item blocks are no longer nested, as the block structuring `div` elements have been removed, and most HTML text elements, such as `p` elements, don't support nesting.
3. List item blocks are wrapped in corresponding `ul`/`ol` and `li` elements.

**Example**

TODO

### Converting HTML to Blocks

`Block` objects can be parsed from an HTML string using the following API call:

```
editor.HTMLToBlocks(htmlString: string): Blocks[]
```

This function preserves all information from the HTML string that has an analogue in BlockNote. This includes all HTML block elements with an equivalent BlockNote block type, HTML inline elements with an equivalent BlockNote style type, and element nesting.

**Example**

TODO

## Converting Blocks To & From Markdown

### Converting Blocks to Markdown

`Block` objects can be converted a Markdown string using the following API call:

```
editor.blocksToHTML(blocks: Block[]): string
```

The Markdown obtained from this function does not preserve all information provided in the `Block` objects due to the inherent limitations of Markdown. This results in a number of features being lost:

1. All block structure is removed, as Markdown has no way of encoding that. This also removes changes in appearance caused by the block's properties.
2. All blocks except those inside list item blocks are no longer nested, as Markdown only supports nesting for list items.
3. Underline, text color, and background color styles are removed as Markdown has no support for them.

**Example**

TODO

### Converting HTML to Blocks

`Block` objects can be parsed from a Markdown string using the following API call:

```
editor.markdownToBlocks(markdownString: string): Blocks[]
```

This function preserves all information from the Markdown string that has an analogue in BlockNote. This includes all syntax with an equivalent BlockNote block or style type and list item nesting.

**Example**

TODO