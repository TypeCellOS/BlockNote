# Introduction

This page will explain:

- what BlockNote is
- some of the design considerations
- motivations for blocknote
- comparison with other frameworks


## About BlockNote
BlockNote is a block-based rich-text editor for [React](https://reactjs.org/) apps, focused on providing an excellent out-of-the-box experience with minimal setup. Unlike other rich-text editor libraries, BlockNote organizes documents into blocks, giving them a more rigid structure and abstracting away the underlying schema.

Conceptually, you can think of a block as a paragraph, heading, image, or some other individual piece of content. Blocks can have more blocks nested inside of them, and can also be moved by dragging and dropping them inside or around each other.

While being easy to set up and providing a great experience from the get-go, BlockNote was also created with extensibility in mind, and allows for the creation of custom block types as well as menu items. Advanced users can even create their own UI from scratch and use BlockNote with vanilla JavaScript instead of React.

## Why Use BlockNote?
There are plenty of libraries out there for creating rich-text editors, which are super powerful and offer great customization options. In fact, BlockNote is built using [TipTap](https://tiptap.dev/) and [ProseMirror](https://prosemirror.net/), both of which are excellent tools for doing exactly that. So why not, for example, use those instead?

A key feature of BlockNote is that it offers a great experience with minimal setup, including a ready-made and animated UI. TipTap, ProseMirror, as well as other, similar tools, focus more on flexibility and extensibility, meaning more work is needed to create an editor with a similar level of polish.

There are, however, rich-text editor libraries which do offer a high level of customization while maintaining a good out-of-the-box experience. The differentiating factor for BlockNote is its block-based design, which gives documents more structure, and allows for a richer user experience while simultaneously making it easier to customize the editor's functionality.

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
