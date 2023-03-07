# Cursor and Selections

This page will explain how to work with the Cursor and Selections

- explain differences
- how to get / set them
- examples (how to get)

## Cursor Positions

BlockNote allows you to keep track of the text cursor position in the editor, to get information about which block it's in and as where it is inside that block.

## Text Cursor

The text cursor is the blinking vertical line you see when typing in the editor. In code, its position is represented using the following object:

```typescript
type TextCursorPosition = {
  block: Block;
}
```

`block:` The block currently containing the text cursor. If the cursor is in a nested block, this is the block at the deepest possible nesting level.

You can get a snapshot of the current text cursor position using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public get textCursorPosition: TextCursorPosition;
...
}

// Usage
const textCursorPosition = editor.textCursorPosition;
```

`returns:` The current text cursor position.
