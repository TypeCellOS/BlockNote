### @blocknote/core/src/pm-nodes

Defines the prosemirror nodes and base node structure. See below:

# Block structure

In the BlockNote API, recall that blocks look like this:

```typescript
{
    id: string;
    type: string;
    children: Block[];
    content: InlineContent[] | undefined;
    props: Record<string, any>;
}
```

`children` describes child blocks that have their own `id` and also map to a `Block` type. Most of the cases these are nested blocks, but they can also be blocks within a `column` or `columnList`.

`content` is the block's Inline Content. Inline content doesn't have any `id`, it's "loose" content within the node.

This is a bit different from the Prosemirror structure we use internally. This document describes the Prosemirror schema architecture.

# Node structure

## BlockGroup

```typescript
name: "blockGroup",
group: "childContainer",
content: "blockGroupChild+"
```

A `blockGroup` is a container node that can contain multiple Blocks. It is used as:

- The root node of the Prosemirror document
- When a block has nested children, they are wrapped in a `blockGroup`

## BlockContainer

```typescript
name: "blockContainer",
group: "blockGroupChild bnBlock",
// A block always contains content, and optionally a blockGroup which contains nested blocks
content: "blockContent blockGroup?",
```

A `blockContainer` is a container node that always contains a `blockContent` node, and optionally a `blockGroup` node (for nested children). It is used as the wrapper for most blocks. This structure makes it possible to nest blocks within blocks.

### BlockContent (group)

Example:

```typescript
name: "paragraph", // name corresponds to the block type in the BlockNote API
content: "inline*", // can also be no content (for image blocks)
group: "blockContent",
```

Blocks that are part of the `blockContent` group define the appearance / behaviour of the main element of the block (i.e.: headings, paragraphs, list items, etc.).
These are only used for "regular" blocks that are represented as `blockContainer` nodes.

## Multi-column

The `multi-column` package makes it possible to order blocks side by side in
columns. It adds the `columnList` and `column` nodes to the schema.

### ColumnList

```typescript
name: "columnList",
group: "childContainer bnBlock blockGroupChild",
// A block always contains content, and optionally a blockGroup which contains nested blocks
content: "column column+", // min two columns
```

The column list contains 2 or more columns.

### Column

```typescript
name: "column",
group: "bnBlock childContainer",
// A block always contains content, and optionally a blockGroup which contains nested blocks
content: "blockContainer+",
```

The column contains 1 or more block containers.

# Groups

We use Prosemirror "groups" to help organize this schema. Here is a list of the different groups:

- `blockContent`: described above (contain the content for blocks that are represented as `BlockContainer` nodes)
- `blockGroupChild`: anything that is allowed inside a `blockGroup`. In practice, `blockContainer` and `columnList`
- `childContainer`: think of this as the container node that can hold nodes corresponding to `block.children` in the BlockNote API. So for regular blocks, this is the `BlockGroup`, but for columns, both `columnList` and `column` are considered to be `childContainer` nodes.
- `bnBlock`: think of this as the node that directly maps to a `Block` in the BlockNote API. For example, this node will store the `id`. Both `blockContainer`, `column` and `columnList` are part of this group.

_Note that the last two groups, `bnBlock` and `childContainer`, are not used anywhere in the schema. They are however helpful while programming. For example, we can check whether a node is a `bnBlock`, and then we know it corresponds to a BlockNote Block. Or, we can check whether a node is a `childContainer`, and then we know it's a container of a BlockNote Block's `children`. See `getBlockInfoFromPos` for an example of how this is used._

## Example document

```xml
<blockGroup>
    <blockContaine id="0">
        <blockContent>Parent element 1</blockContent>
        <blockGroup>
            <blockContainer id="1">
                <blockContent>Nested / child / indented item</blockContent>
            </blockContainer>
        </blockGroup>
    </blockContainer>
    <blockContainer id="2">
        <blockContent>Parent element 2</blockContent>
        <blockGroup>
            <blockContainer id="3">...</blockContainer>
            <blockContainer id="4">...</blockContainer>
        </blockGroup>
    </blockContainer>
    <blockContainer id="5">
        <blockContent>Element 3 without children</blockContent>
    </blockContainer>
    <columnList id="6">
        <column id="7">
            <blockContainer id="8">
                <blockContent>Column 1</blockContent>
            </blockContainer>
        </column>
        <column id="9">
            <blockContainer id="10">
                <blockContent>Column 2</blockContent>
            </blockContainer>
        </column>
    </columnList>
</blockGroup>
```

## Tables

Tables are implemented a special type of blockContent node. The rows and columns are stored in the `content` fields, not in the `children`. This is because children of tables (rows / columns / cells) are not considered to be blocks (they don't have an id, for example).
