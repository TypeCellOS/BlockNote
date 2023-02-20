# Introduction

This page will explain:

- what BlockNote is
- some of the design considerations
- motivations for blocknote
- comparison with other frameworks

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
