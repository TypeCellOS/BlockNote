# Manipulating blocks

Below, we explain how to read Blocks from the editor, and how to create / remove / update Blocks.

## Accessing Blocks

The first thing we can do with Blocks, is to get them from the editor, and there are a few different ways of doing that.

### Getting All Blocks

You can retrieve all root-level blocks from the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public get allBlocks(): Block[];
...
}

// Usage
const allBlocks = editor.allBlocks;
```

`returns:` An array containing all root-level blocks in the editor, represented as `Block` objects.

We've actually already seen this used for the live example in [Getting Familiar with Block Objects](blocks#getting-familiar-with-block-objects), where we showed its output below the editor.

### Getting the Hovered Block

TODO: this should probably move to "cursor and selections", and then we can link to there

In some cases, you may want to know which block is being hovered by the text or mouse cursor, this is also quite easy to do for either.

**Accessing Block Hovered by Text Cursor**

We can get the block hovered by the text cursor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public get textCursorPosition: TextCursorPosition;
...
}

// Usage
const blockContainingTextCursor = editor.textCursorPosition.block;
```

`returns:` The block currently containing the text cursor.

**Additional Information**

If the mouse/text cursor is in a nested block, only the hovered block at the deepest nesting level is returned. More information on how mouse & text cursor positions can be found in [Cursor and Selections](cursor-selections.md).

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
    blockToInsertAt: Block,
    placement: "before" | "after" | "nested" = "before"
  ): void;
...
}

// Usage
editor.insertBlocks(blocksToInsert, blockToInsertAt, placement)
```

`blocksToInsert:` An array of block specifications which define the blocks that should be inserted.

`blockToInsertAt:` An existing block, at which the new blocks should be inserted.

`placement:` Determines whether the blocks should be inserted just before, just after, or nested inside the existing block. Inserts the blocks at the start of the existing block's children if `"nested"` is used.

## Updating Blocks

You can update an existing block in the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public updateBlock(
    blockToUpdate: Block,
    updatedBlock: PartialBlock
  ): void;
...
}

// Usage
editor.updateBlock(blockToUpdate, updatedBlock)
```

`blockToUpdate:` An existing block that should be updated.

`updatedBlock:` A block specification which defines how the existing block should be updated.

#### Partial updates

Since the `updatedBlock` argument is a `PartialBlock` object, some fields might not be defined. Fields in the target block that are not present in `PartialBlock` are not affected and kept as-is.

## Removing Blocks

You can remove existing blocks from the editor using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public removeBlocks(
    blocksToRemove: Block[],
  ): void;
...
}

// Usage
editor.removeBlocks(blocksToRemove)
```

`blocksToRemove:` An array of existing blocks that should be removed.

## Replacing Blocks

You can replace existing blocks in the editor with new blocks using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public replaceBlocks(
    blocksToRemove: Block[],
    blocksToInsert: PartialBlock[],
  ): void;
...
}

// Usage
editor.replaceBlocks(blocksToRemove, blocksToInsert)
```

`blocksToRemove:` An array of existing blocks that should be replaced.

`blocksToInsert:` An array of blocks that the existing ones should be replaced with.

#### Additional Information

If the blocks provided in `blocksToRemove` are not adjacent or are at different nesting levels, `blocksToInsert` will be inserted in place of the first block in the array.
