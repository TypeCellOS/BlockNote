# Custom Code Block Theme & Language

To configure a code block highlighting theme and language, you can use the `codeBlock` option in the `useCreateBlockNote` hook.

This allows you to configure a shiki highlighter for the code blocks of your editor, allowing you to tailor the themes and languages you would like to use.

To create a highlighter, you can use the [shiki-codegen](https://shiki.style/packages/codegen) CLI for generating the code to create a highlighter for your languages and themes.

For example to create a highlighter using the optimized javascript engine, javascript, typescript, vue, and light and dark themes, you can run the following command:

```bash
npx shiki-codegen --langs javascript,typescript,vue --themes light,dark --engine javascript --precompiled ./shiki.bundle.ts
```

This will generate a `shiki.bundle.ts` file that you can use to create a highlighter for your editor.

Like this:

```ts
import { createHighlighter } from "./shiki.bundle.js";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    codeBlock: {
      indentLineWithTab: true,
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: {
          name: "TypeScript",
          aliases: ["ts"],
        },
      },
      createHighlighter: () =>
        createHighlighter({
          themes: ["light-plus", "dark-plus"],
          langs: [],
        }),
    },
  });

  return <BlockNoteView editor={editor} />;
}
```

**Relevant Docs:**

- [Editor Setup](/docs/editor-basics/setup)
- [shiki-codegen](https://shiki.style/packages/codegen)
