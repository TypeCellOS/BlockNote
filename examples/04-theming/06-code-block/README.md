# Code Block Highlighting

To enable code block syntax highlighting, you can use the `codeBlock` option in the `useCreateBlockNote` hook. This is excluded by default to reduce bundle size

We've created a default setup which automatically includes some of the most common languages in the most optimized way possible. The language syntaxes are loaded on-demand to ensure the smallest bundle size for your users.

To use it, you can do the following:

```tsx
import { codeBlock } from "@blocknote/code-block";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    codeBlock,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
```

If you need to configure the themes or support more languages, you can provide your own codeBlock highlighting like described in [the custom code block docs](./custom-code-block/)

**Relevant Docs:**

- [Editor Setup](/docs/editor-basics/setup)
