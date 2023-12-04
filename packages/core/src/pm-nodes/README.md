### @blocknote/core/src/pm-nodes

Defines the prosemirror nodes and base node structure. See below:


# Node structure

We use a Prosemirror document structure where every element is a `block` with 1 `content` element and one optional group of children (`blockgroup`).

- A `block` can only appear in a `blockgroup` (which is also the type of the root node)
- Every `block` element can have attributes (e.g.: is it a heading or a list item)
- Every `block` element can contain a `blockgroup` as second child. In this case the `blockgroup` is considered nested (indented in the UX)

This architecture is different from the "default" Prosemirror / Tiptap implementation which would use more semantic HTML node types (`p`, `li`, etc.). We have designed this block structure instead to more easily:

- support indentation of any node (without complex wrapping logic)
- supporting animations (nodes stay the same type, only attrs are changed)

## Example

```xml
<blockgroup>
    <block>
        <content>Parent element 1</content>
        <blockgroup>
            <block>
                <content>Nested / child / indented item</content>
            </block>
        </blockgroup>
    </block>
    <block>
        <content>Parent element 2</content>
        <blockgroup>
            <block>...</block>
            <block>...</block>
        </blockgroup>
    </block>
    <block>
        <content>Element 3 without children</content>
    </block>
</blockgroup>
```
