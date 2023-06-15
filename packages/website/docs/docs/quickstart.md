---
title: Quickstart
description: Getting started with BlockNote is quick and easy. All you need to do is install the package and add the React component to your app!
imageTitle: Quickstart
path: /docs/quickstart
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils";

const { isDark } = useData();
</script>

# Quickstart

<div><a href="https://www.npmjs.com/package/@blocknote/core"><img style="display: inline" alt="NPM" src="https://img.shields.io/npm/v/@blocknote/react"></a> <a href="https://github.com/TypeCellOS/BlockNote"><img style="display: inline" alt="GitHub Repo stars" src="https://img.shields.io/github/stars/TypeCellOS/BlockNote?style=social"></a></div>

Getting started with BlockNote is quick and easy. All you need to do is install the package and add the React component to your app!

## Installing with NPM

Install BlockNote with [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) by running the following command in your console:

```
npm install @blocknote/core @blocknote/react
```

## Creating an Editor

BlockNote is meant for use with React, so creating an editor in an existing React app is easy. Using the `useBlockNote` hook, we can create a new editor instance, then use the`BlockNoteView` component to render it. You can see how to do that in the example below, where we create a new BlockNote editor inside the main `App` component of our React app:

```typescript
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({});

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

As well as `BlockNoteView` and `useBlockNote`, we import `@blocknote/core/style.css` to provide default styling for the editor.

## Demo: Basic App Using BlockNote

Taking the same code, the live preview below turns it into a super simple, working app:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    theme: "{{ getTheme(isDark) }}"
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

## Next steps

You now know how to integrate BlockNote into your React app! However, this is just scratching the surface of what you can do with the editor.

### Customizing Menus

You might notice that in previous examples, we've been calling `useBlockNote` with an empty object (`{}`). This object represents the editor options, which can be used to customize the editor's menus and behaviour.

To find out more about BlockNote editor options and menu customization, visit [Customizing the Editor](/docs/editor).

### Interacting with the Editor Using Code

You also access and manipulate blocks in the editor programmatically with different editor functions.

To find out more about blocks, editor functions and manipulating the editor using code, visit [Introduction to Blocks](/docs/blocks).
