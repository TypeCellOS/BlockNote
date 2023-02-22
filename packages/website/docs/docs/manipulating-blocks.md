# Manipulating blocks

This page will explain:

TBD: how deep do we need to go into blockspec vs block, or can we just document the functions?

- accessing blocks
- creating blocks
- updating blocks
- removing blocks

## Accessing Blocks

The first step in manipulating blocks using the BlockNote API, is accessing them, and there are several API functions available to do this. They're listed below, and the one you should use depends on your use case.

It's important to keep in mind that `Block` objects returned using said API functions represent the block *at that point in time*. That means that if an API function is called, any `Block` objects it returns won't be updated, even if their corresponding blocks change in the editor. Therefore, whenever you use a `Block` object, it's important to make sure that the block it represents has not been edited.

### Getting All Blocks

The simplest way to access a given block is to first get all blocks in the editor , then navigate through them until you find what you're looking for. The following API call returns an array of `Block` objects, which represents all blocks in the editor:

```
const allBlocks: Block[] = editor.allBlocks;
```

We've actually already seen this function used for live example in **TODO** Getting Familiar with Block Objects, where we displayed its output below the editor. Typically though, you'll want to process the results further. Let's look at a few examples of how we could do that:

**Accessing Blocks by Index**

Since `editor.allBlocks` returns an array of `Block` objects, we can access them by index, which we use in the example below to return the first and last block in the editor. You can access a block's children by index too, as they're also represented as an array of `Block` objects.

```
function getFirstAndLastBlocks(): {firstBlock: Block; lastBlock: Block} {
    const allBlocks: Block[] = editor.allBlocks;
    
    return {
        firstBlock: allBlocks[0];
        lastBlock: allBlocks[allBlocks.length - 1]
    }
}
```

**Traversing All Blocks**

If you want to traverse each block in the editor, including nested blocks, the easiest way to do so is using recursion. In the example below, we call the `helper` function for each `Block` object returned by `editor.allBlocks`, which logs its text content in the console.

Then, it calls itself recursively for each nested block, logging its text content too, and this recursive call keeps executing until a block without children is found. If you think of each block as a node in a tree, this method traverses said tree in a depth-first manner.

```
function logAllBlocksTextContent(): void {
    function helper(block: Block) {
        console.log(block.textContent + "\n");
        
        for (const child of block.children) {
            helper(child);
        }
    }
    
    const allBlocks = editor.allBlocks;
    for (const block of allBlocks) {
        helper(block);
    }
}
```

**Executing a Callback for Each Block**

A common use case when for the BlockNote API executing a callback for each block in the editor. This is a more generalized case of the previous example, where we called `console.log(block.textContent)` for each block. Now, we execute our callback instead, which is passed as an argument to the function. In the example below, we create a callback which checks if the block is a heading block, and adds its ID to an array if it is.

This pattern is incredibly useful as it allows you to access each block in the editor one by one and process them immediately.

```
function callbackForEachBlock(callback: (block: Block) => void): Block[] {    
    function helper(block: Block) {
        callback(block);
        
        for (const child of block.children) {
            helper(child);
        }
    }
    
    const allBlocks = editor.allBlocks;
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

### Getting Hovered Blocks

It's quite useful to know whether a block is being hovered by either the text or mouse cursor, yet `Block` objects don't contain any information that could help with that. Instead, this is handled by other objects that can be accessed using the BlockNote API.

**Accessing Blocks Hovered with Text Cursor**

The block currently hovered by the text cursor is found in the `TextCursorPosition` object, and we can retrieve it using the following API call:

```
const textCursorHoveredBlock: Block = editor.textCursorPosition.block;
```

This will return a `Block` object representing the block currently containing the text cursor, or more specifically, the *most immediate* block currently containing the text cursor. This means that if the text cursor lies in a nested block, the `Block` object returned will represent the most nested block possible that still contains the cursor, as opposed to one of its parents. More information regarding the `TextCursorPosition` object can be found in **TODO** Cursor and Selections.

## BlockSpec Objects

While the BlockNote API is centered around the use of `Block` objects, we might encounter some issues if we try to use it to insert new blocks or update existing ones. For example, what value do we set the `id` field to, if we want to insert a new block? And what if we want to update an existing block, do we have to set the `textContent` and `styledTextContent` fields independently?

As you can see, while `Block` objects are great for describing blocks, they aren't as useful for creating or updating new ones, which is what `BlockSpec` objects are for:

```
type BlockSpec = {
    type: string;
    props?: Record<string, string>;
    content?: string | StyledTextContent[];
    children?: BlockSpec[];
}
```

`BlockSpec` objects are almost identical to `Block`s, with a few important differences:

1. The `id` field is gone, as its value is automatically generated by the editor and should never be edited manually.
2. The `textContent` and `styledTextContent` fields are collapsed into a single `content` field which can be of either type. They're effectively just different ways of representing a block's content, and there's no need to set it twice.
3. The `children` field is an array of `BlockSpec` objects rather than `Block`s, as otherwise we'd end up running into the same issues mentioned earlier.
4. The `props`, `content`, and `children` fields are optional. If they aren't defined, this is handled differently depending on if you're inserting a new block or updating an existing one. When inserting a new block, they take on default values, which are described in **TODO** Inserting Blocks. When updating an existing block, they're simply ignored.

## Inserting Blocks

## Updating Blocks

## Removing Blocks