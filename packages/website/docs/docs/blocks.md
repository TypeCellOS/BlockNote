# Introduction to Blocks

This page will explain all about blocks:

- what are blocks
- how to get the "document"?
- example block
- explain fields in blocks

## Editor Functions

As well as being able to use BlockNote through the browser window, you can also interact with the editor programmatically by calling various functions. These functions can read, write, and listen to the editor in basically any way you want.

All we need to start using editor functions is a BlockNote editor itself. We already went over how to set up a basic editor in [Creating an Editor](quickstart#creating-an-editor), so we can just work from that.

Below are some examples of the kinds of functions you can call from the editor. It's just a small taste of what's to come, but should hopefully give you an idea for why they're useful:

```typescript
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({});
  
  // Executes a callback whenever the editor contents change.
  editor.onContentChange(() => {
    // Gets the first block in the editor.
    const firstBlock = editor.allBlocks[0];
    
    // Checks if the first block is not a title/heading 1 block.
    if (firstBlock.type !== "heading" || firstBlock.props.level !== "1") {
      // Updates the first block to be a title/heading 1 block.
      editor.updateBlock({
        type: firstBlock, 
        props: { type: "heading", props: { level: "1"} }
      });
    }
  })
  
  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

## Block Objects

BlockNote is centered around the idea of blocks, each containing an individual piece of content and optionally also containing nested blocks. This design philosophy extends to code, in which the `Block` object type is used to describe any given block in the editor:

```typescript
type Block = {
  id: string | null;
  type: string;
  props: Record<string, string>;
  content: StyledText[];
  children: Block[];
};
```

`id:` The block's ID. Multiple blocks cannot share a single ID, and a block will keep the same ID from when it's created until it's removed.

`type:` The block's type, which determines several things. One of these, is the kind of content that the block contains, such as a paragraph, heading, or image. The type also establishes what properties the block can have, and affects the block's appearance as well as behaviour in the editor. It's important to note that nested blocks do not inherit their parent blocks' type, and you can find a list of all default types in [Default Block Types](block-types#default-block-types).

`props:` The block's properties, which are a set of key/value pairs that further modify its appearance or behaviour alongside its type. This means that the properties that a block can have are also entirely determined by its type. You can find more information on which properties each type of block has in [Default Block Types](block-types#default-block-types).

`content:` The block's content, represented as an array of `StyledText` objects. It contains not only plain text information regarding the block's contents, but also the inline styles applied, such as bold, italic, and text color. This does not include content from any nested blocks. For more information on StyledText objects, visit [Rich Text Content](rich-text.md).

`children:` Any blocks nested inside the block. The nested blocks are also represented using `Block` objects.

**Additional Information**

In each BlockNote editor, not only is the entire editor content represented entirely using `Block` objects, but most editor functions also either return them, or take them as arguments. Therefore, it's important to familiarize yourself with them, as they'll be referenced throughout the documentation.

It's also important to keep in mind that `Block` objects represent a block in the editor _at that point in time_. This means that once you obtain a `Block` object, it won't be automatically updated, no matter what happens to its corresponding block in the editor. Therefore, whenever you use a `Block` object, it's important to make sure that the block it represents has not been edited or removed since it was created.

## Getting Familiar with Block Objects

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
