---
name: create-example
description: Creates a new example under the `/examples` directory.
---

This skill provides instructions on how to create a BlockNote editor example correctly.

# Creating an example root directory

Under the `/examples` directory, each subdirectory is a category of examples. It's name consists of a 2 digit index, followed by a dash and the category name.

Each of these contains another set of subdirectories, where each one contains a single example. The naming of these is the same, but the category name is swapped for the example name.

Based on the user's prompt, the most relevant category should be chosen, and a new directory for the example should be created. The index in the example directory's name should be the lowest unused one to avoid large diffs from having to reorder & rename the existing example directories. It is very unlikely that a new category directory should need to be created for the new example, but it should use the same convention.

# Source & metadata files

## Source files

Any source files must be inside a `/src` directory at the root of the example directory. Within these, there must also be an `App.tsx` file, which default exports a React component. This component is responsible for rendering the entire example.

## Metadata files

There are two files containing metadata that must also be added at the root of the example directory:

`.bnexample.json`

Contains all of the example's configuration. Here's an annotated example (from `/examples/03-ui-components/13-custom-ui/.bnexample.json`):

```
<!-- Whether the example should be visible in the playground (i.e. when running `vp dev` in the project's root directory). This should default to `true` unless instructed otherwise. -->
"playground": true,
<!-- Whether the example should be visible on the BlockNote website. This should usually be `true`, unless the example is just for testing. -->
"docs": true,
<!-- The author's name. Can be left blank for the user to fill out. -->
"author": "matthewlipski",
<!-- Relevant tags for the example. Should aim to reuse ones from existing examples rather than creating new ones. -->
"tags": [
  "Advanced",
  "Inline Content",
  "UI Components",
  "Block Side Menu",
  "Formatting Toolbar",
  "Suggestion Menus",
  "Slash Menu",
  "Appearance & Styling"
],
<!-- NPM dependencies the source files rely on. -->
"dependencies": {
  "@mui/icons-material": "^5.16.1",
  "@mui/material": "^5.16.1"
},
<!-- Whether to hide the example behind a subscription on the BlockNote website. Default to `false` unless instructed otherwise. -->
"pro": true
```

`README.md`

A Markdown description of the example. Made of four parts:

1. Heading with the example name. This does not necessarily need to be the same as the example directory name and can be more verbose.
2. Description of the example, which should be no longer than a paragraph of three sentences.
3. An optional "Try me out!" callout. Should be a single sentence instructing the user how to see the changes made to the editor in the example.
4. A list of relevant docs. These are mostly internal but may also refer to e.g. dependencies used in the example.

See `/examples/07-collaboration/01-partykit` for reference on the exact markup of these sections.

# Generated files

Once the source & metadata files are done, `vp run gen` should be executed from the project root directory to auto-generate additional files in the example directory, as well as the playground & docs.

One of the generated files is `package.json` in the example directory. If the `bnexample.json` specified any dependencies, these will be included here. Therefore, `vp install` should always be executed in the project root directory after, to ensure these are installed.
