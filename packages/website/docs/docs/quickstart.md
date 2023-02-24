# Quickstart

How to install and add to your app.

- npm install
- add react component

All set! Explain possible areas to explore next

## Setting up BlockNote

Getting started with BlockNote is quick and easy. All you need to do is install the package and add the React component to your app!

### Installing with NPM

Installing BlockNote is done using [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), which you can do by running the following command in your console:

```
npm install @blocknote/core @blocknote/react
```

### Creating an Editor

BlockNote is meant for use with React, so creating an editor in an existing React app is easy. Using the `useBlockNote` hook, we can create a new editor instance, then use the`BlockNoteView` component to render it. You can see how to do that in the example below, where we create a new BlockNote editor inside the main `App` component of our React app:

```
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

function App() {
    // Creates a new editor instance.
    const editor = useBlockNote({});
    
    // Renders the editor instance using a React component.
    return <BlockNoteView editor={editor} />;
}
```

As well as `BlockNoteView` and `useBlockNote`, we import `@blocknote/core/style.css` to provide default styling for the editor.

### Minimal Example

Taking the same code from [Creating the Editor](quickstart#creating-an-editor), the example below turns it into a super simple working app:

**TODO** Live example

The only differences are some additional files, which contain boilerplate code for the app, and some extra styling to position the editor.

## Next steps

You now know how to use BlockNote with your React app! However, this is just scratching the surface of what you can do with the editor.

### Customizing Menus

You might notice that in previous examples, we've been calling `useBlockNote` with an empty object. This object represents the editor options, which can be used to customize the editor's menus and behaviour.

To find out more about BlockNote editor options and menu customization, visit [Customizing the Editor](editor.md).

### Interacting with the Editor Using Code

The BlockNote editor can not only be interacted with through the browser window, but also through code using the BlockNote API. The API allows you to access and manipulate blocks in the editor programmatically, by calling various functions.

To find out more about the BlockNote API and manipulating the editor programmatically, visit [Introduction to Blocks](blocks.md).