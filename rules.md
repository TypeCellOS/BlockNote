# Ideal world solution

## List items

- If the first child has ONLY text content, take the text content and flatten it into the list item. Subsequent children are carried over as is.
  - e.g. `<li><h1>Hello</h1><p>World</p></li> -> <li>Hello<p>World</p></li>`
- Else, take the content and insert it as children instead.
  - e.g. `<li><img src="" /></li> -> <li><p></p><img src="" /></li>`

## Table cells now: (`inline*`)

- Merge all text content within a table cell into a single paragraph.
- Discard all other content.

## Table cells later: (`block*`)

- Try to insert all content as children.

## Custom block with content

Configurable to use either algorithm.

## Preserve vs. Merge

- Preserve: Probably the default options. Backwards-compatible, and would be hard to "unmerge" content.
