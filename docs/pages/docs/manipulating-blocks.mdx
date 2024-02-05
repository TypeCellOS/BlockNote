---
title: Manipulating Blocks
description: How to read Blocks from the editor, and how to create / remove / update Blocks.
imageTitle: Manipulating Blocks
path: /docs/manipulating-blocks
---

# Manipulating Blocks

Below, we explain how to read Blocks from the editor, and how to create / remove / update Blocks.

## Block Identifiers

Whenever you need to find a block in the editor for accessing, inserting, updating, removing, or replacing a block, you can use a `BlockIdentifier`. This can be either a `string` representing the block ID, or a `Block` object from which the ID is taken:

```typescript
type BlockIdentifier = string | Block;
```

## Accessing Blocks

There are a few different ways to retrieve Blocks from the editor:

### Getting All Top-Level Blocks

You can retrieve a snapshot of all top-level (non-nested) blocks in the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public get topLevelBlocks(): Block[];
...
}

// Usage
const blocks = editor.topLevelBlocks;
```

`returns:` A snapshot of all top-level (non-nested) blocks in the editor.

We've actually already seen this used for the live example in [Getting Familiar with Block Objects](/docs/blocks#demo-getting-familiar-with-block-objects), where we showed its output below the editor.

### Getting a Specific Block

Use `getBlock` to retrieve a snapshot of a specific block in the editor:

```typescript
// Definition
class BlockNoteEditor {
...
  public getBlock(blockIdentifier: BlockIdentifier): Block | undefined;
...
}

// Usage
const block = editor.getBlock(blockIdentifier);
```

`blockIdentifier:` The [identifier](#block-identifiers) of an existing block that should be retrieved.

`returns:` The block that matches the identifier, or `undefined` if no matching block was found.

### Traversing All Blocks

You can traverse all blocks in the editor depth-first, and execute a callback for each, using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public forEachBlock(
    callback: (block: Block) => boolean,
    reverse: boolean = false
  ): void;
...
}

// Usage
editor.forEachBlock((block) => {...});
```

`callback:` The callback to execute for each block. Returning `false` stops the traversal.

`reverse:` Whether the blocks should be traversed in reverse order.

### Getting the Hovered Block

BlockNote uses `TextCursorPosition` objects to represent the text cursor's position. In these, you can also find the block that currently contains the text cursor. To find out more about `TextCursorPosition` objects, head to [Cursor & Selections](/docs/cursor-selections).

## Partial Blocks

When retrieving blocks from the editor, you always receive complete `Block` objects. For updating or creating blocks, you can pass a `PartialBlock` type:

```typescript
type PartialBlock = {
  id?: string;
  type?: string;
  props?: Partial<Record<string, string>>;
  content?: string | InlineContent[];
  children?: BlockSpec[];
};
```

`PartialBlock` objects are almost the same as regular `Block` objects, but with all members optional and partial `props`. This makes updating or creating simpler blocks much easier. We'll see this below.

## Inserting New Blocks

You can insert new blocks into the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public insertBlocks(
    blocksToInsert: PartialBlock[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" | "nested" = "before"
  ): void;
...
}

// Usage
editor.insertBlocks(blocksToInsert, referenceBlock, placement)
```

`blocksToInsert:` An array of [partial blocks](#partial-blocks) that should be inserted.

`referenceBlock:` An [identifier](#block-identifiers) for an existing block, at which the new blocks should be inserted.

`placement:` Whether the blocks should be inserted just before, just after, or nested inside the `referenceBlock`. Inserts the blocks at the start of the existing block's children if `"nested"` is used.

If a block's `id` is undefined, BlockNote generates one automatically. Throws an error if the reference block could not be found.

## Updating Blocks

You can update an existing block in the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public updateBlock(
    blockToUpdate: BlockIdentifier,
    update: PartialBlock
  ): void;
...
}

// Example to change a block type to paragraph
editor.updateBlock(blockToUpdate, { type: "paragraph" });
```

`blockToUpdate:` The [identifier](#block-identifiers) of an existing block that should be updated.

`update:` A [partial block](#partial-blocks) which defines how the existing block should be changed.

Since `updatedBlock` is a `PartialBlock` object, some fields might not be defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could not be found.

## Removing Blocks

You can remove existing blocks from the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public removeBlocks(
    blocksToRemove: BlockIdentifier[],
  ): void;
...
}

// Usage
editor.removeBlocks(blocksToRemove)
```

`blocksToRemove:` An array of [identifiers](#block-identifiers) for existing blocks that should be removed.

Throws an error if any of the blocks could not be found.

## Replacing Blocks

You can replace existing blocks in the editor with new blocks using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public replaceBlocks(
    blocksToRemove: BlockIdentifier[],
    blocksToInsert: PartialBlock[],
  ): void;
...
}

// Usage
editor.replaceBlocks(blocksToRemove, blocksToInsert)
```

`blocksToRemove:` An array of [identifiers](#block-identifiers) for existing blocks that should be replaced.

`blocksToInsert:` An array of [partial blocks](#partial-blocks) that the existing ones should be replaced with.

If the blocks that should be removed are not adjacent or are at different nesting levels, `blocksToInsert` will be inserted at the position of the first block in `blocksToRemove`. Throws an error if any of the blocks to remove could not be found.

## Nesting & Un-nesting Blocks

BlockNote also provides functions to nest & un-nest the block containing the [Text Cursor](/docs/cursor-selections#text-cursor).

### Nesting Blocks

You can check whether the block containing the [Text Cursor](/docs/cursor-selections#text-cursor) can be nested (i.e. if there is a block above it at the same nesting level) using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public canNestBlock(): boolean;
...
}

// Usage
const canNestBlock = editor.canNestBlock();
```

Then nest the block with another call:

```typescript
// Definition
class BlockNoteEditor {
...
  public nestBlock(): void;
...
}

// Usage
editor.nestBlock();
```

### Un-nesting Blocks

You can also check whether the block containing the [Text Cursor](/docs/cursor-selections#text-cursor) can be un-nested (i.e. if it's nested in another block) using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public canUnnestBlock(): boolean;
...
}

// Usage
const canUnnestBlock = editor.canUnnestBlock();
```

Then un-nest the block with another call:

```typescript
// Definition
class BlockNoteEditor {
...
  public unnestBlock(): void;
...
}

// Usage
editor.unnestBlock();
```