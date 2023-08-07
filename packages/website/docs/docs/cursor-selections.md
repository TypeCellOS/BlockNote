---
title: Cursor & Selections
description: If you want to know which block(s) the user is currently editing, you can do so using cursor positions and selections.
imageTitle: Cursor & Selections
path: /docs/cursor-selections
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils";

const { isDark } = useData();
</script>

# Cursor & Selections

If you want to know which block(s) the user is currently editing, you can do so using cursor positions and selections.

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

### Demo: Highlighting Block Containing the Text Cursor

If you need a visualization for which block contains the text cursor, the demo below highlights it in blue in real time.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor, Block } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
    // Listens for when the text cursor position changes.
    onTextCursorPositionChange: (editor) => {
      // Gets the block currently hovered by the text cursor.
      const hoveredBlock: Block = editor.getTextCursorPosition().block;

      // Traverses all blocks.
      editor.forEachBlock((block) => {
        if (
          block.id === hoveredBlock.id &&
          block.props.backgroundColor !== "blue"
        ) {
          // If the block is currently hovered by the text cursor, makes its 
          // background blue if it isn't already.
          editor.updateBlock(block, {
            props: {backgroundColor: "blue"},
          });
        } else if (
          block.id !== hoveredBlock.id &&
          block.props.backgroundColor === "blue"
        ) {
          // If the block is not currently hovered by the text cursor, resets 
          // its background if it's blue.
          editor.updateBlock(block, {
            props: {backgroundColor: "default"},
          });
        }
        
        return true;
      });
    }
  })
  
  // Renders the editor instance.
  return <BlockNoteView editor={editor}/>;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

## Selections

When you highlight content using the mouse or keyboard, this is called a selection. BlockNote uses `Selection` objects to show which blocks the current selection spans across:

```typescript
type Selection = {
  blocks: Block[];
}
```

`blocks:` The blocks currently spanned by the selection, including nested blocks.

### Getting Selection

You can get a snapshot of the current selection using the following call:

```typescript
// Definition
class BlockNoteEditor {
...
  public getSelection(): Selection | undefined;
...
}

// Usage
const selection = editor.getSelection();
```

`returns:` A snapshot of the current selection, or `undefined` if no selection is active.

### Demo: Highlighting Blocks Spanned by Selection

If you need a visualization for which blocks the text cursor spans, the demo below highlights them in blue in real time.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor, Block } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
    // Listens for when the text cursor position changes.
    onTextCursorPositionChange: (editor) => {
      // Gets the blocks currently spanned by the selection.
      const selectedBlocks: Block[] | undefined = editor.getSelection()?.blocks;
      // Converts array of blocks to set of block IDs for more efficient comparison.
      const selectedBlockIds: Set<string> = new Set<string>(
        selectedBlocks?.map((block) => block.id) || []
      );

      // Traverses all blocks.
      editor.forEachBlock((block) => {
        // If no selection is active, resets the background color of each block.
        if (selectedBlockIds.size === 0) {
          editor.updateBlock(block, {
            props: { backgroundColor: "default" },
          });

          return true;
        }

        if (
          selectedBlockIds.has(block.id) &&
          block.props.backgroundColor !== "blue"
        ) {
          // If the block is currently spanned by the selection, makes its
          // background blue if it isn't already.
          editor.updateBlock(block, {
            props: { backgroundColor: "blue" },
          });
        } else if (
          !selectedBlockIds.has(block.id) &&
          block.props.backgroundColor === "blue"
        ) {
          // If the block is not currently spanned by the selection, resets
          // its background if it's blue.
          editor.updateBlock(block, {
            props: { backgroundColor: "default" },
          });
        }

        return true;
      });
    },
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::