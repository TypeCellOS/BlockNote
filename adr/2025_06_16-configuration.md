# BlockNote Configuration

Editors are widely different across applications, often with users having opposing requirements. Most editors explode with complexity when trying to support all of these use cases. So, there needs to be a guide for the different ways to configure so that there is not just a single overwhelming list of options.

Fundamentally, there are few different kinds of things to be configured:

- **block-configuration**: The configuration for a specific kind of block
  - e.g. the `table` block might have toggles for enabling/disabling the header rows/columns
- **schema-configuration**: The configuration of what blocks, inline content, and styles are available in the editor
  - e.g. whether to include the `table` block at all
- **extension-level-configuration**: The configuration of the extension itself
  - e.g. what ydoc should the collaboration extension use
- **extension-configuration**: The configuration of the extensions that are available in the editor
  - e.g. whether to add collaboration to the editor
- **editor-view-configuration**: The configuration of the editor views
  - e.g. whether to show the sidebar, the toolbar, etc.
- **editor-configuration**: The configuration of the editor itself
  - e.g. how to handle paste events

These forms of configuration are not mutually exclusive, and can be combined in different ways. For example, knowing that the editor has collaboration enabled, might change the what the keybindings do for undo/redo.

In an ideal world, these configurations would be made at the "lowest possible level", like configuring the number of levels of headings would be configured when composing the schema for the editor, rather than at the editor level.

Configuration should be publicly accessible, so that mixed combinations can be created (i.e. different behaviors for an editor with or without collaboration).

## TODO

- Describe how you configure at the block level, then compose that into a schema, the compose that into an editor, and then compose that into a view.
