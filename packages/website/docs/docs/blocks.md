# Introduction to Blocks

So, you've set up a BlockNote editor and your users can start writing content, organized in blocks. What are blocks exactly, and how do we access the blocks from code?

## Editor Functions

The `editor` returned from `useBlockNote` exposes functions to access and update blocks.
We'll go through the full API later in this section, but let's start with a simple example - logging all blocks in the editor whenever its contents change:

```typescript
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({});

  // Executes a callback whenever the editor contents change.
  editor.onContentChange(() => {
    // Get and log all top-level, i.e. non-nested blocks in the editor.
    const blocks = editor.topLevelBlocks;
    console.log("Content was changed:", blocks);
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

## Block Objects

So, BlockNote is centered around the idea of blocks. A block - like a Heading, Paragraph, or List item - contains a piece of content and optionally nested blocks. In code, the `Block` type is used to describe any given block in the editor:

```typescript
type Block = {
  id: string;
  type: string;
  props: Record<string, string>;
  content: InlineContent[];
  children: Block[];
};
```

`id:` The block's ID. Multiple blocks cannot share a single ID, and a block will keep the same ID from when it's created until it's removed.

`type:` The block's type, such as a paragraph, heading, or list item. For an overview of built-in block types, see [Block Types & Properties](block-types).

`props:` The block's properties are stored in a set of key/value pairs and specify how the block looks and behaves. Different block types have different props - see [Block Types](block-types) for more.

`content:` The block's content, represented as an array of `InlineNode` objects. This does not include content from any nested blocks. For more information on `InlineNode` objects, visit [Inline Content](inline-content.md).

`children:` Any blocks nested inside the block. The nested blocks are also represented using `Block` objects.

## Demo: Getting Familiar with Block Objects

Now that we know how blocks are represented in code, let's take a look at the live example below. We have a BlockNote editor, under which we display its contents using an array of `Block` objects. Feel free to play around and get a better feel for how blocks look in the editor, compared to how they're represented using `Block` objects.

**TODO** Live example.

::: sandbox {template=react-ts}

```typescript /App.tsx
import { useState } from "react";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import "./styles.css";

export default function App() {
  const [editorAPI, setEditorAPI] = useState(null);
  const [blocks, setBlocks] = useState(null);

  // Creates a new editor instance.
  const editor = useBlockNote({});

  // Saves the editor's contents as Block objects.
  editor.onContentChange(() => setBlocks(editor.allBlocks));

  // Renders the editor instance using a React component.
  return (
    <>
      <BlockNoteView editor={editor} />
      <div>{blocks}</div>
    </>
  );
}
```

```css /styles.css [hidden]
#root {
  margin-left: 45px;
  width: calc(100% - 90px);
}
```

:::
