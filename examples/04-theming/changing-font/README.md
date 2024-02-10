# Changing Font

In this example, we override some of the default editor CSS, to change the font within the editor.

There are several useful CSS selectors that you can use to style different parts of the editor:

- `.bn-container` selects the container for the editor and all menus/toolbars.
- `.bn-editor` selects the editor itself.
- `[data-node-type="blockContainer"]` selects all blocks.
- `[data-content-type="X"]` selects the content of all blocks of type X (excluding child blocks). Can also have `[data-Y="..."]` attributes for each of the block's props that don't use the default value. E.g. `[data-content-type="heading"][data-level="2"]` will select all heading blocks with heading level 2.
- `[data-node-type="blockGroup"]` selects all wrapper elements for child blocks.

**Relevant Docs:**

- [Theming & Styling in CSS](/docs/theming#theming-styling-in-css)