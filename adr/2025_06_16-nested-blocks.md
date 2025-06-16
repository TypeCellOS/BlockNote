# BlockNote Nested Blocks

There are two separate problems when it comes to "nested blocks" support in BlockNote:

- **nested-blocks** The first is the ability for a block to contain other blocks within it (e.g. a table cell having not just inline content, but actual other blocks inside it)
- **content-fields** The second is the ability for a block to contain multiple pieces of content within it (e.g. an alert block having a title & description field (which contain inline content))

Let's start with the first problem, nested blocks. By describing existing block relationships:

## Block with inline content

This is the simplest case, and the only one that is currently supported by BlockNote.

```json
{
  "type": "block-type",
  "content": [
    {
      "type": "text",
      "text": "Hello, world!"
    }
  ],
}
```

There is a 1:1 relationship between the block type and it's content. And, no restrictions of the inline content allowed within the block.

> TODO come up with a description of the sorts of keybinds & cursor behavior that should be supported for this block type

## Block with nested blocks

This is a proposal for how to support nested blocks.

```json
{
  "type": "custom-block-type",
  "props": {
    "abc": 123
  },
  "content": null,
  "children": [
    {
      "type": "nested-block",
      "content": [
        {
          "type": "block",
          "content": [
            {
              "type": "text",
              "text": "Hello, world!"
            }
          ]
        }
      ]
    }
  ]
}
```

This would completely enclose all nested blocks within the `custom-block-type` block. And, works the same way as the multi-column example.

> TODO come up with a description of the sorts of keybinds & cursor behavior that should be supported for this block type

## Block with structured inline content fields

This is a proposal for how to support multiple inline content fields within a block.

```json
{
  "type": "alert",
  "content": null,
  "children": [
    {
      "type": "alert-title",
      "content": [
        {
          "type": "text",
          "text": "Hello, world!"
        }
      ]
    },
    {
      "type": "alert-content",
      "content": [
        {
          "type": "text",
          "text": "Hello, world!"
        }
      ]
    }
  ]
}
```

The core idea is that the `parent` block restricts what content is allowed within it's children.

> TODO come up with a description of the sorts of keybinds & cursor behavior that should be supported for this block type

## Examples

### Rebuilding tables with nested blocks

Using this new structure, we can rebuild tables if we had this new API:

```json
{
  "type": "table",
  "content": null,
  "props": {
    "backgroundColor": "default",
    "textColor": "default",
    "columnWidths": [100, 100, 100],
    "headerRows": 1,
    "headerCols": 1,
  },
  "children": [
    {
      "type": "table-row",
      "content": null,
      "children": [
        {
          "type": "table-cell",
          "content": null,
          "children": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Hello, world!"
                }
              ]
            }
          ]
        },
        {
          "type": "table-cell",
          "content": null,
          "children": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Hello, world!"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
