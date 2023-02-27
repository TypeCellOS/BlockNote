# Manipulating blocks

This page will explain:

TBD: how deep do we need to go into blockspec vs block, or can we just document the functions?

- accessing blocks
- creating blocks
- updating blocks
- removing blocks

## Accessing Blocks

The first step in manipulating blocks using the BlockNote API is accessing them, and there are several API functions available to do this. They're listed below, and the one you should use depends on your use case.

### Getting All Blocks

The simplest way to access a given block is to first get all blocks in the editor , then navigate through them until you find what you're looking for. The first thing to do is retrieving all blocks in the editor, which can be done using the following getter from the API:

```typescript
// Definition
class BlockNoteAPI {
...
  public get allBlocks(): Block[];
...
}

// Usage
const allBlocks = editorAPI.allBlocks;
```

`returns:` An array containing all blocks in the editor, represented as `Block` objects.

We've actually already seen this used for the live example in [Getting Familiar with Block Objects](blocks#getting-familiar-with-block-objects), where we displayed its output below the editor. Typically though, you'll want to process the results further. Let's look at a few examples of how we could do that.

**Accessing Blocks by Index**

Since `editor.allBlocks` returns an array of `Block` objects, we can simply access them by index, which we use in the example below to return the first and last block in the editor. You can access a block's children by index too, as they're also represented as an array of `Block` objects.

```typescript
function getFirstAndLastBlocks(): {firstBlock: Block; lastBlock: Block} {
    const allBlocks: Block[] = editorAPI.allBlocks;
    
    return {
        firstBlock: allBlocks[0],
        lastBlock: allBlocks[allBlocks.length - 1]
    }
}
```

**Traversing All Blocks**

If you want to traverse each block in the editor, including nested blocks, the best way to do so is using a recursive function. In the example below, we call the `helper` function for each `Block` object returned by `editor.allBlocks`, which logs its text content in the console.

Then, it calls itself recursively for each nested block, logging its text content too, and this recursive call keeps executing until a block without children is found. If you think of each block as a node in a tree, this method traverses said tree in a depth-first manner.

```typescript
function logAllBlocksTextContent(): void {
    function helper(block: Block) {
        // Logs block text content.
        console.log(block.textContent + "\n");
        
        // Recursive call for each nested block.
        for (const child of block.children) {
            helper(child);
        }
    }
    
    // Gets all blocks in the editor.
    const allBlocks = editorAPI.allBlocks;
    
    // Runs helper function for each block.
    for (const block of allBlocks) {
        helper(block);
    }
}
```

**Executing a Callback for Each Block**

A common use case when for the BlockNote API executing a callback for each block in the editor. This is a more generalized case of the previous example, where we called `console.log(block.textContent)` for each block. Now, we execute a callback instead, which is passed as an argument to the function. In the example below, we create a callback which checks if the block is a heading block, and adds its ID to an array if it is.

This pattern is incredibly useful as it allows you to access each block in the editor, one by one, and process them immediately.

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
    const allBlocks = editorAPI.allBlocks;
    
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

In some cases, you may want to know whether a block is being hovered by either the text or mouse cursor, yet `Block` objects don't contain any information that could help with that. Instead, this is handled by other getters in the BlockNote API.

**Accessing Block Containing Text Cursor**

The block currently containing the text cursor is found in the `TextCursorPosition` object, and we can retrieve it using the following API call:

```typescript
// Definition
class BlockNoteAPI {
...
  public get textCursorPosition: TextCursorPosition;
...
}

// Usage
const blockContainingTextCursor = editorAPI.textCursorPosition.block;
```
`returns:` The block currently containing the text cursor.

More specifically, this returns the *most immediate* block currently containing the text cursor. This means that if the text cursor lies in a nested block, the `Block` object returned will represent the most nested block possible that still contains the cursor, as opposed to one of its parents. More information regarding the `TextCursorPosition` object can be found in **TODO** Cursor and Selections.

## BlockSpec Objects

While the BlockNote API is centered around the use of `Block` objects, we might encounter some issues if we try to use it to insert new blocks or update existing ones. For example, what value do we set the `id` field to, if we want to insert a new block? And what if we want to update an existing block, do we have to set the `textContent` and `styledTextContent` fields independently?

As you can see, while `Block` objects are great for describing blocks, they aren't as useful for creating or updating new ones, which is what `BlockSpec` objects are for:

```typescript
type BlockSpec = {
    type: string;
    props?: Partial<Record<string, string>>;
    content?: string | StyledTextContent[];
    children?: BlockSpec[];
}
```

You can think of these as specifications that define blocks, which `Block` objects can then describe, once they materialize in the editor. `BlockSpec` objects are rather similar in structure to `Block`s, but have a few important differences:

1. The `id` field is gone, as its value is automatically generated by the editor and should never be edited manually.
2. The `textContent` and `styledTextContent` fields are collapsed into a single `content` field which can be of either type. They're effectively just different ways of representing a block's content, so this avoids having to set the content twice.
3. The `children` field is an array of `BlockSpec` objects rather than `Block`s, as otherwise we'd end up running into the same issues mentioned earlier.
4. The `props`, `content` and `children` fields are optional. If they aren't defined, this is handled differently depending on if you're inserting a new block or updating an existing one, which we'll go over in the next sections.
5. The `props` field is also partial. The keys inside `props` are determined by the `type` field, and can either be assigned default values when inserting a new block, or ignored when updating an existing one. We'll also discuss this in more detail in the next sections.

As you can probably guess, `BlockSpec` objects are used whenever we want to insert a new block into the editor, or when we want to update an existing one. While not as commonplace as `Block` objects in the BlockNote API, you'll be working with them a lot when manipulating blocks, so it's still important to understand why they're needed and how they're structured.

## Inserting Blocks

You can insert new blocks into the editor using the following API call:

```typescript
// Definition
class BlockNoteAPI {
...
  public insertBlocks(
    blocksToInsert: BlockSpec[],
    blockToInsertAt: Block,
    placement: "before" | "after" | "nested" = "before"
  ): void;
...
}

// Usage
editorAPI.insertBlocks(blocksToInsert, blockToInsertAt, placement)
```

`blocksToInsert:` An array of block specifications which define the blocks that should be inserted.

`blockToInsertAt:` An existing block, at which the new blocks should be inserted.

`placement:` Determines whether the blocks should be inserted just before, just after, or nested inside the existing block. Inserts the blocks at the start of the existing block's children if `"nested"` is used.

**Optional Fields in BlockSpec Objects**

The `blocksToInsert` argument is an array of `BlockSpec` objects, which have optional fields that need to be handled if they're undefined.

Whenever either the `content` or `children` field isn't defined in an item in `blocksToInsert`, they assume the following default values:

`content =  "";`

`children = [];`

A default value can also be assigned to `props` or any keys inside it if it's either undefined or only partially defined, though this depends on the value of `type`. To find out more about default values for `props`, check out [Default Block Types](block-types#default-block-types).

## Updating Blocks

You can update an existing block in the editor using the following API call:

```typescript
// Definition
class BlockNoteAPI {
...
  public updateBlock(
    blockToUpdate: Block,
    updatedBlock: BlockSpec
  ): void;
...
}

// Usage
editorAPI.updateBlock(blockToUpdate, updatedBlock)
```

`blockToUpdate:` An existing block that should be updated.

`updatedBlock:` A block specification which defines how the existing block should be updated.

**Optional Fields in BlockSpec Objects**

The `updatedBlock` argument is also a `BlockSpec` object, which has optional fields that need to be handled if they're undefined.

If any of the optional `props`, `content`, or `children` fields are undefined in `updatedBlock`, the block keeps whatever properties, content, or nested blocks it had before.

There is one caveat regarding the `props` field, as different block types have different properties. Therefore, only properties which are compatible with the updated block type can be kept. Additionally, the new type might introduce more properties, which are assigned default values if they're not defined in `props`. You can check which properties each block types has, as well as their default values, in [Default Block Types](block-types#default-block-types).

## Removing Blocks

You can remove existing blocks from the editor using the following API call:

```typescript
// Definition
class BlockNoteAPI {
...
  public removeBlocks(
    blocksToRemove: Block[],
  ): void;
...
}

// Usage
editorAPI.removeBlocks(blocksToRemove)
```

`blocksToRemove:` An array of existing blocks that should be removed.