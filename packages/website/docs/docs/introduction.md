# Introduction to BlockNote

<div><a href="https://www.npmjs.com/package/@blocknote/core"><img style="display: inline" alt="NPM" src="https://img.shields.io/npm/v/@blocknote/react"></a> <a href="https://github.com/yousefed/blocknote"><img style="display: inline" alt="GitHub Repo stars" src="https://img.shields.io/github/stars/yousefed/blocknote?style=social"></a></div>

BlockNote is a block-based rich-text editor for [React](https://reactjs.org/), focused on providing a great out-of-the-box experience with minimal setup.

With BlockNote, we want to make it easy for developers to add a next-generation text editing experience to their app, with a UX that's on-par with industry leaders like Notion or Coda.

Unlike other rich-text editor libraries, BlockNote organizes documents into blocks, giving them a more rigid structure and making it easy to interact with the document from code.

Conceptually, you can think of a block as a paragraph, heading, image, or some other individual piece of content. Blocks can have more blocks nested inside of them, and can also be moved by dragging and dropping them inside or around each other.

BlockNote has been created with extensibility in mind. You can customize the document, create custom block types and customize UX elements like menu items. Advanced users can even create their own UI from scratch and use BlockNote with vanilla JavaScript instead of React.

## Why BlockNote?

There are plenty of libraries out there for creating rich-text editors. In fact, BlockNote is built on top of the widely used [ProseMirror](https://prosemirror.net/) and [TipTap](https://tiptap.dev/).

As powerful as they are, these libraries often have quite a steep learning-curve and require you to customize every single detail of your editor, and then you still need to add your own UI elements.

BlockNote instead, offers a great experience with minimal setup, including a ready-made and animated UI.

On top of that, it comes with a modern block-based design. This gives documents more structure, allow for a richer user experience while simultaneously making it easier to customize the editor's functionality.

## Community

BlockNote is currently in early beta. We'd love your feedback! If you have questions, need help, or want to contribute reach out to the community on [Discord](https://discord.gg/Qc2QTTH5dF) and [GitHub](https://github.com/yousefed/blocknote).

## Next: Set up BlockNote

See how to set up your own editor in the [Quickstart](/docs/quickstart). Here's a quick sneak peek in case you can't wait!

::: sandbox {template=react-ts}

```typescript /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({});

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

:::
