# Manipulating blocks

This page will explain:

TBD: how deep do we need to go into blockspec vs block, or can we just document the functions?

- accessing blocks
- creating blocks
- updating blocks
- removing blocks

## Accessing Blocks

The first step in manipulating blocks is accessing them, and there are several editor functions available to do this. They're listed below, and the one you should use depends on your use case.

### Getting All Blocks

The simplest way to access a given block is to first get all blocks in the editor , then navigate through them until you find what you're looking for. The first thing to do is retrieving all blocks in the editor, which can be done using the following getter:

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

A common use case when working with blocks, is executing a callback for each block in the editor. This is a more generalized case of the previous example, where we called `console.log(block.textContent)` for each block. Now, we execute a callback instead, which is passed as an argument to the function. In the example below, we create a callback which checks if the block is a heading block, and adds its ID to an array if it is.

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

In some cases, you may want to know whether a block is being hovered by either the text or mouse cursor, yet `Block` objects don't contain any information that could help with that. Instead, this is handled by other getters.

**Accessing Block Containing Text Cursor**

The block currently containing the text cursor is found in the `TextCursorPosition` object, and we can retrieve it using the following call:

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

## Partial Blocks

While interacting with the editor is centered around the use of `Block` objects, they can be cumbersome when we use them to insert new blocks or update existing ones. After all, if we want to just insert an empty paragraph, defining each field in a `Block` object to do so can feel pretty unnecessary. It's not obvious what kind of ID we should assign either.

To alleviate these issues, you can define new or updated blocks using `PartialBlock` objects:

```typescript
type PartialBlock = {
    id?: string;
    type: string;
    props?: Partial<Record<string, string>>;
    content?: string | StyledTextContent[];
    children?: BlockSpec[];
}
```

As you can see, `PartialBlock` objects are effectively the same as regular `Block` objects, but don't need to be fully defined. The first benefit of these is that it makes creating simpler blocks much easier, and also crucially means that you can use a `Block` object in place of any `PartialBlock`. This makes things like duplicating and updating blocks far smoother, as you always receive `Block` objects when accessing existing blocks.

## Inserting Blocks

You can insert new blocks into the editor using the following call:

```typescript
// Definition
class BlockNoteAPI {
...

  public insertBlocks(
    blocksToInsert: PartialBlock[],
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

**Additional Information**

Since the `blocksToInsert` argument is an array of `PartialBlock` objects, some fields may be left undefined, which we need to interpret somehow. When inserting new blocks, we assign them default values which are as simple as possible:

`id` is assigned a string that's automatically generated in the following format:

```typescript
// Each "X" represents a lowercase alphabet character or number
id = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
```

`props` is assigned an object, the entries of which depend on the value of `type`. The value of `type` determines the keys that have to be in `props` and the values they can take, as well as their default values, which you can find more about in [Default Block Types](block-types#default-block-types). If `props` is partially defined, the required keys are added with their default values.

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
class BlockNoteAPI {
...
  public updateBlock(
    blockToUpdate: Block,
    updatedBlock: PartialBlock
  ): void;
...
}

// Usage
editorAPI.updateBlock(blockToUpdate, updatedBlock)
```

`blockToUpdate:` An existing block that should be updated.

`updatedBlock:` A block specification which defines how the existing block should be updated.

**Additional Information**

Since the `updatedBlock` argument is a `PartialBlock` object, some fields may be left undefined, which we need to interpret somehow. When updating existing blocks, we just copy over the old values.

There is one caveat regarding the `props` field, as different block types have different properties. Therefore, only properties which are compatible with the updated block type can be kept. Additionally, the new type might introduce more properties, which are assigned default values if they're not defined in `props`. You can check which properties each block types has, as well as their default values, in [Default Block Types](block-types#default-block-types).

## Removing Blocks

You can remove existing blocks from the editor using the following call:

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

## Replacing Blocks

You can replace existing blocks in the editor with new blocks using the following call:

```typescript
// Definition
class BlockNoteAPI {
...

  public replaceBlocks(
    blocksToRemove: Block[],
    blocksToInsert: PartialBlock[],
  ): void;

...
}

// Usage
editorAPI.replaceBlocks(blocksToRemove, blocksToInsert)
```

`blocksToRemove:` An array of existing blocks that should be replaced.

`blocksToInsert:` An array of blocks that the existing ones should be replaced with.

**Additional Information**

The blocks provided in `blocksToRemove` are generally expected to be adjacent and at the same level of nesting, in which case it's clear where `blocksToInsert` should be inserted. However, this isn't strictly required, and if the blocks provided in `blocksToRemove` are not adjacent or at different nesting levels, `blocksToInsert` will be inserted in place of the first element in thje array.