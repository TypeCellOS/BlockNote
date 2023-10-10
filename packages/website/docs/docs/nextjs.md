---
title: Next.js and BlockNote
description: Details on integrating BlockNote with Next.js
imageTitle: Next.js and BlockNote
path: /docs/nextjs
---

# Next.js and BlockNote

BlockNote is a component that should only be rendered client-side (and not on the server). If you're using Next.js, you need to make sure that Next.js does not try to render BlockNote as a server-side component.

Make sure to use BlockNote in a [Client Component](https://nextjs.org/docs/getting-started/react-essentials#client-components). You can do this by creating a separate file for your component (**make sure this sits outside of your `pages` or `app` directory**), and starting that with `"use client";` [directive](https://react.dev/reference/react/use-client):

```typescript
"use client"; // this registers <Editor> as a Client Component
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";

// Our <Editor> component we can reuse later
export default function Editor() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({});

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

## Import as dynamic

Now, you can use [Dynamic Imports](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading) to make sure BlockNote is only imported on the client-side.

You can import the component we just created above using `next/dynamic` in your page:

```typescript
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./editor"), { ssr: false });

function App() {
  return (
    <div>
      <Editor />
    </div>
  );
}
```

This should resolve any issues you might run into when embedding BlockNote in your Next.js React app!
