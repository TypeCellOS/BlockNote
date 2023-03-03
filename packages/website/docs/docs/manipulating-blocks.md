# Manipulating blocks

This page will explain:

TBD: how deep do we need to go into blockspec vs block, or can we just document the functions?

- accessing blocks
- creating blocks
- updating blocks
- removing blocks

## Accessing Blocks

The first thing we can do with blocks, is to get them from the editor, and there are a few different ways of doing that.

### Getting All Blocks

You can retrieve all blocks from the editor using the following call:

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

`returns:` An array containing all blocks in the editor, represented as `Block` objects.

We've actually already seen this used for the live example in [Getting Familiar with Block Objects](blocks#getting-familiar-with-block-objects), where we showed its output below the editor. Most of the time though, you'll want to find specific blocks. Let's look at a few examples of how we could do that.

**Accessing Blocks by Index**

Since `editor.allBlocks` returns an array of `Block` objects, we can just access them by index. We do this in the example below to get the first and last block in the editor. You can also access a block's children by index.

```typescript
function getFirstAndLastBlocks(): {firstBlock: Block; lastBlock: Block} {
    const allBlocks: Block[] = editor.allBlocks;
    
    return {
        firstBlock: allBlocks[0],
        lastBlock: allBlocks[allBlocks.length - 1]
    }
}
```

**Traversing All Blocks**

If you want to go over each block in the editor, including nested blocks, the best way to do that is using recursion. In the example below, we use a recursive function to log the content of every block in the editor. If you think of each block as a node in a tree, this method traverses the tree in a depth-first manner.

```typescript
function logAllBlocksTextContent(): void {
    function helper(block: Block) {
        // Logs block text content.
        console.log(block.content + "\n");
        
        // Runs helper function for each nested block.
        for (const child of block.children) {
            helper(child);
        }
    }
    
    // Gets all blocks in the editor.
    const allBlocks = editor.allBlocks;
    
    // Runs helper function for each block.
    for (const block of allBlocks) {
        helper(block);
    }
}
```

**Executing a Callback for Each Block**

A common use case is executing a callback for each block in the editor. This is a more general case of the previous example, where we called logged the content of each block.

Now, we execute a callback instead, which is passed as an argument. In the example below, we create a callback which checks if the block is a heading block, and adds its ID to an array if it is.

```typescript
function callbackForEachBlock(callback: (block: Block) => void): Block[] {    
    function helper(block: Block) {
        // Executes callback.
        callback(block);
        
        // Recursive call for each nested block.
        for (const child of block.children) {
            helper(child);
        }
    }
    
    // Gets all blocks in the editor.
    const allBlocks = editor.allBlocks;
    
    // Runs helper function for each block.
    for (const block of allBlocks) {
        helper(block);
    }
}

const headingBlockIds: Block[] = [];
function callback(block: Block): void {
    if (block.type === "heading") {
        headingBlockIds.push(block.id)
    }
}

callbackForEachBlock(callback);
```

### Getting the Hovered Block

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

While interacting with the editor is centered around `Block` objects, they aren't that practical for inserting new blocks or updating existing ones. If we want to just insert an empty paragraph, defining each field in a `Block` object would feel pretty unnecessary.

Therefore, you can use `PartialBlock` objects when inserting or updating blocks:

```typescript
type PartialBlock = {
    id?: string;
    type: string;
    props?: Partial<Record<string, string>>;
    content?: string | InlineNode[];
    children?: BlockSpec[];
}
```

`PartialBlock` objects are almost the same as regular `Block` objects, but don't need to be fully defined, which makes creating simpler blocks much easier. It also means that you can also use a `Block` object in place of any `PartialBlock`.

## Inserting Blocks

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

**Additional Information**

Since the `blocksToInsert` argument is an array of `PartialBlock` objects, some fields might not be defined. When inserting new blocks, we assign them the simplest possible values:

`id` is assigned a string that's automatically generated in the following format:

```typescript
// Each "X" represents a lowercase alphabet character or number
id = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
```

`props` is assigned an object with entries that depends on `type`. If `props` is partially defined, entries are added, again depending on the value of `type`. You can find out more about the properties of different block types in [Block Types](block-types#block-types), as well as their default values.

`content` is assigned an empty string:
```typescript
content =  "";
```

`children` is assigned an empty array:
```typescript
children = [];
```

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

**Additional Information**

Since the `updatedBlock` argument is a `PartialBlock` object, some fields might not be defined. When updating existing blocks, we just copy over the values from `blockToUpdate`.

However, only properties which are compatible with the updated type are kept. If `props` is partially defined, entries are added, again depending on the value of `type`. You can find out more about the properties of different block types in [Block Types](block-types#block-types), as well as their default values.

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

**Additional Information**

If the blocks provided in `blocksToRemove` are not adjacent or are at different nesting levels, `blocksToInsert` will be inserted in place of the first block in the array.