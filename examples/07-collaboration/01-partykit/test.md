# TODAY

## Understanding ProseMirror

ul > li > p
ul > li > h1...
How does prosemirror handle a paste with the paragraph?

- It allows a list item to have a `paragraph block*` (forcing a single paragraph, but allowing other block content after it).
- It does not allow a heading as the only content within a list item.

Before & After prosemirror-model changed??

Before:

What is the behavior we want?

### Relative to the parent

It gives us two possible behaviors:

1. Allowing us to "collapse" content to coerce it into whatever content shape we want (e.g. a heading withing a list item can be collapsed into a paragraph).
2. Allowing us to "move-out" content which is not allowed within the current context (e.g. an image within a list item can be moved out of the list item and into a child of the list item).

Maybe there is some way to make this opt-in or something generic like that.

### Relative to the content

img should always break out

## data-editable

- It's ugly, see if we need it or not.
