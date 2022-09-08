# BlockNote

<a href="https://discord.gg/aDQxXezfNj"><img alt="Discord" src="https://img.shields.io/badge/Chat on discord%20-%237289DA.svg?&style=for-the-badge&logo=discord&logoColor=white"/></a> <a href="https://matrix.to/#/#typecell-space:matrix.org"><img alt="Matrix" src="https://img.shields.io/badge/Chat on matrix%20-%23000.svg?&style=for-the-badge&logo=matrix&logoColor=white"/></a>

[![npm version](https://badge.fury.io/js/%40blocknote%2Fcore.svg)](https://badge.fury.io/js/%blocknote%2Fcore)

**Welcome to BlockNote editor: a "Notion-style" block-based extensible text editor built on top of [Prosemirror](https://prosemirror.net/) and [Tiptap](https://tiptap.dev/).**

# Live demo

Play with the editor @ [https://blocknote-main.vercel.app/](https://blocknote-main.vercel.app/).

(Source in [examples/editor](/examples/editor))

# Example code (React)

```typescript
import { EditorContent, useEditor } from "@blocknote/core";
import "@blocknote/core/style.css";

function App() {
  const editor = useEditor({
    onUpdate: ({ editor }) => {
      // Log the document to console on every update
      console.log(editor.getJSON());
    },
  });

  return <EditorContent editor={editor} />;
}
```

# Features

BlockNote comes with a number of features and components to make it easy to embed a high-quality block-based editor in your app:

### Animations:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/animations.gif?raw=true" width="400" />

### Helpful placeholders:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/placeholders.gif?raw=true" width="400" />

### Drag and drop blocks:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/dragdrop.gif?raw=true" width="400" />

### Nesting / indentation with tab and shift+tab:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/nesting.gif?raw=true" width="400" />

### Slash (/) menu:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/slashmenu.gif?raw=true" width="400" />

### Format menu:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/selectmenu.gif?raw=true" width="400" />

### Real-time collaboration:

<img src="https://github.com/YousefED/BlockNote/blob/readme/.resources/collaboration.gif?raw=true" width="400" />

# Contributing

Directory structure:

```
blocknote
├── packages/core       - The editor that can be used in other applications
├── examples/editor     - The main example application that just embeds the editor
└── tests               - Playwright end to end tests
```

An introduction into the BlockNote Prosemirror schema can be found in [packages/core/ARCHITECTURE.md](https://github.com/YousefED/BlockNote/blob/main/packages/core/ARCHITECTURE.md).

## Running

To run the project, open the command line in the project's root directory and enter the following commands:

    # Install all required npm modules for lerna, and bootstrap lerna packages
    npm install
    npm run bootstrap

    # Start the example project
    npm start

## Adding packages

- Add the dependency to the relevant `package.json` file (packages/xxx/package.json)
- run `npm run install-new-packages`
- Double check `package-lock.json` to make sure only the relevant packages have been affected

# Credits ❤️

BlockNote builds directly on two awesome projects; [Prosemirror](https://prosemirror.net/) by Marijn Haverbeke and [Tiptap](https://tiptap.dev/). Consider sponsoring those libraries when using BlockNote: [Prosemirror](https://marijnhaverbeke.nl/fund/), [Tiptap](https://github.com/sponsors/ueberdosis).

BlockNote is built as part of [TypeCell](https://www.typecell.org). TypeCell is proudly sponsored by the renowned [NLNet foundation](https://nlnet.nl/foundation/) who are on a mission to support an open internet, and protect the privacy and security of internet users. Check them out!

<a href="https://nlnet.nl"><img src="https://nlnet.nl/image/logos/NGIAssure_tag.svg" alt="NLNet" width="100"></a>
