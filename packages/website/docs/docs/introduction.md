# Introduction

This page will explain:

- what BlockNote is
- some of the design considerations
- motivations for blocknote
- comparison with other frameworks


## About BlockNote
BlockNote is a block-based rich-text editor for React apps, focused on providing an excellent out-of-the-box experience with minimal setup. Unlike other rich-text editor libraries, BlockNote documents are built entirely out of blocks, giving documents a more rigid structure and abstracting away the underlying schema.

Conceptually, you can think of a block as a paragraph, heading, image, or some other individual piece of content. Blocks can have more blocks nested inside of them, and can also be moved around by dragging and dropping them inside or around other blocks.

While being easy to set up and providing a great experience from the get-go, BlockNote was also created with extensibility in mind, and allows for the creation of custom block types as well as menu items. Advanced users can even create their own UI from scratch and use BlockNote with vanilla JavaScript.

## Why Use BlockNote?
There are plenty of libraries out there for creating rich-text editors, which are super powerful and offer great customization options. In fact, BlockNote is built on top of TipTap and ProseMirror, both of which are excellent tools for doing exactly that. So why not, for example, use those instead?

A key feature of BlockNote is that it offers a great experience with minimal setup, including a ready-made and animated UI. TipTap, ProseMirror, as well as other, similar tools, focus more on flexibility and extensibility, meaning more setup is needed to achieve a similar level of polish.

There are however, rich-text editor libraries which do offer a high level of customization alongside while having a good out-of-the-box experience. The differentiating factor for BlockNote is its block-based design, which gives BlockNote documents a more well-defined structure, and allows for a richer user experience while making it easier to build on.

## Testing live sandbox

yay:

::: sandbox {template=react-ts}

```typescript /App.tsx
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  const editor = useBlockNote({
    onUpdate: ({ editor }) => {
      // Log the document to console on every update
      console.log(editor.getJSON());
    },
  });

  return <BlockNoteView editor={editor} />;
}
```

:::
