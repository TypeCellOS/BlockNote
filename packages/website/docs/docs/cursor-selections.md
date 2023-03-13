# Cursor and Selections

This page will explain how to work with the Cursor and Selections

- explain differences
- how to get / set them
- examples (how to get)

## Cursor Positions

BlockNote allows you to keep track of the text cursor position in the editor, to get information about which block it's in and the surrounding blocks.

## Text Cursor

The text cursor is the blinking vertical line you see when typing in the editor. In code, its position is represented using the following object:

```typescript
type TextCursorPosition = {
  block: Block;
  prevBlock: Block | undefined;
  nextBlock: Block | undefined;
}
```

`block:` The block currently containing the text cursor. If the cursor is in a nested block, this is the block at the deepest possible nesting level.

`prevBlock:` The previous block at the same nesting level. Undefined if the block containing the text cursor is the first child of its parent, or the first block in the editor.

`nextBlock:` The next block at the same nesting level. Undefined if the block containing the text cursor is the last child of its parent, or the last block in the editor.

### Getting Text Cursor Position

You can get a snapshot of the current text cursor position using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public getTextCursorPosition(): TextCursorPosition;
...
}

// Usage
const textCursorPosition = editor.getTextCursorPosition();
```

`returns:` A snapshot of the current text cursor position.

### Setting Text Cursor Position

You can set the text cursor position to the start or end of an existing block using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public setTextCursorPosition(
    targetBlock: BlockIdentifier, 
    placement: "start" | "end" = "start"
  ): void;
...
}

// Usage
editor.setTextCursorPosition(targetBlock, placement);
```

`targetBlock:` The [identifier](/docs/manipulating-blocks#block-identifiers) of an existing block that the text cursor should be moved to.

`placement:` Whether the text cursor should be placed at the start or end of the block.

Throws an error if the target block could not be found.
