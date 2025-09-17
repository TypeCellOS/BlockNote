# Custom Code Block Theme & Language

To configure a code block highlighting theme and language, you can extend the editor's default schema with a new `codeBlock`, which you can pass options into when creating. You can then use a shiki highlighter to add custom syntax highlighting.

First use the [shiki-codegen](https://shiki.style/packages/codegen) CLI to create a `shiki.bundle.ts` file. You can then pass this file into the `codeBlock` options when creating it.

**Relevant Docs:**

- [Code Blocks](/docs/features/blocks/code-blocks)
- [shiki-codegen](https://shiki.style/packages/codegen)
- [Custom Schema](/docs/features/custom-schemas)
