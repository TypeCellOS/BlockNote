# Manipulating blocks

Below, we explain how to read Blocks from the editor, and how to create / remove / update Blocks.

## Block Identifiers

Whenever you need to find a block in the editor for accessing, inserting, updating, removing, or replacing a block, you can use a `BlockIdentifier`. This can be either the block's ID string, or a `Block` object from which the ID is taken:

```typescript
type BlockIdentifier = string | Block;
```

## Accessing Blocks

The first thing we can do with Blocks, is to get them from the editor, and there are a few different ways of doing that.

### Getting All Top-Level Blocks

You can retrieve a snapshot of all top-level blocks in the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public get topLevelBlocks(): Block[];
...
}

// Usage
const allBlocks = editor.topLevelBlocks;
```

`returns:` An array containing all top-level, or non-nested blocks in the editor.

We've actually already seen this used for the live example in [Getting Familiar with Block Objects](blocks#demo-getting-familiar-with-block-objects), where we showed its output below the editor.

### Getting a Specific Block

If you want to retrieve a snapshot of a specific block in the editor using the following call:

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

`blockIdentifier:` The identifier of an existing block that should be retrieved.

`returns:` The block that matches the identifier, or nothing if no matching block was found.

### Traversing All Blocks

You can traverse all blocks in the editor depth-first, and execute a callback for each, using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public allBlocks(
    callback: (block: Block) => void, 
    reverse: boolean = true
  ): void;
...
}

// Usage
editor.allBlocks((block) => {...});
```

`callback:` The callback to execute for each block.

`reverse:` Whether the blocks should be traversed in reverse order.

### Getting the Hovered Block

BlockNote uses `TextCursorPosition` objects to represent the text cursor's position. In these, you can also find the block that currently contains the text cursor. To find out more about `TextCursorPosition` objects, head to [Cursor and Selections](cursor-selections.md).

## Partial Blocks

When retrieving blocks from the editor, you always receive complete `Block` objects. For updating or creating blocks, you can pass a `PartialBlock` type:

```typescript
type PartialBlock = {
  id?: string;
  type: string;
  props?: Partial<Record<string, string>>;
  content?: string | InlineNode[];
  children?: BlockSpec[];
};
```

`PartialBlock` objects are almost the same as regular `Block` objects, but with all members optional. This makes updating or creating simpler blocks much easier. We'll see this below.

## Inserting New Blocks

You can insert new blocks into the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public insertBlocks(
    blocksToInsert: PartialBlock[],
    blockToInsertAt: BlockIdentifier,
    placement: "before" | "after" | "nested" = "before"
  ): void;
...
}

// Usage
editor.insertBlocks(blocksToInsert, blockToInsertAt, placement)
```

`blocksToInsert:` An array of blocks that should be inserted.

`blockToInsertAt:` An identifier for an existing block, at which the new blocks should be inserted.

`placement:` Determines whether the blocks should be inserted just before, just after, or nested inside the existing block. Inserts the blocks at the start of the existing block's children if `"nested"` is used.

## Updating Blocks

You can update an existing block in the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public updateBlock(
    blockToUpdate: BlockIdentifier,
    updatedBlock: PartialBlock
  ): void;
...
}

// Usage
editor.updateBlock(blockToUpdate, updatedBlock)
```

`blockToUpdate:` An identifier for existing block that should be updated.

`updatedBlock:` A block which that the existing block should be updated to.

#### Partial updates

Since the `updatedBlock` argument is a `PartialBlock` object, some fields might not be defined. Fields in the target block that are not present in `PartialBlock` are not affected and kept as-is.

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

`blocksToRemove:` An array of identifiers for existing blocks that should be removed.

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

`blocksToRemove:` An array of identifiers for existing blocks that should be replaced.

`blocksToInsert:` An array of blocks that the existing ones should be replaced with.

#### Additional Information

If the blocks that should be removed are not adjacent or are at different nesting levels, `blocksToInsert` will be inserted in place of the block found by the first identifier in `blocksToRemove`.
