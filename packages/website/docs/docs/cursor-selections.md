# Cursor & Selections

If you want to know which block(s) the user is currently editing, you can do so using cursor positions and selections.

## Cursor Positions

BlockNote keeps track of the text cursor position in the editor and exposes functions that let you retrieve it or change it.

## Text Cursor

The text cursor is the blinking vertical line you see when typing in the editor. BlockNote uses `TextCursorPosition` objects to give you information about the block it's in as well as those around it:

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

**Demo**

::: sandbox {template=react-ts}

```typescript /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    // Listens for when the text cursor position changes.
    onTextCursorPositionChange: (editor) => {
      // Gets the block currently hovered by the text cursor.
      const hoveredBlock = editor.getTextCursorPosition().block;

      // Traverses all blocks.
      editor.forEachBlock((block) => {
        if (
          block.id === hoveredBlock.id &&
          block.props.backgroundColor !== "blue"
        ) {
          // If the block is currently hovered by the text cursor, makes its 
          // background blue if it isn't already.
          editor.updateBlock(hoveredBlock, {
            props: {backgroundColor: "blue"},
          });
        } else if (
          block.id !== hoveredBlock.id &&
          block.props.backgroundColor === "blue"
        ) {
          // If the block not is currently hovered by the text cursor, resets 
          // its background if it's blue.
          editor.updateBlock(block, {
            props: {backgroundColor: "default"},
          });
        }
      });
    }
  })
  
  // Renders a BlockNote editor.
  return <BlockNoteView editor={editor}/>;
}
```

:::