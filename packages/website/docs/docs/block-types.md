# Block types

This page will explain:

- list all built-in blocks + examples
- shortcuts & different behaviour?
- explain props
- creating your own block types: Coming Soon!

## Default Block Types

In the BlockNote API, `Block` objects have a `type` field which determines the content it contains and what keys its `props` field contains, as well as its appearance and behaviour in the editor. If you're not familiar with `Block` objects or the BlockNote API, head to **TODO** Introduction to Blocks.

There are a variety of default block types that can be used in BlockNote, which are listed below along with their corresponding `type` and `props` values.

### Paragraph

**Appearance**

TODO

**Type & Props**

```
type ParagraphBlock{
    ...
    type: "paragraph";
    props: {}
    ...
}
```

### Heading
**Appearance**

TODO

**Type & Props**

```
type HeadingBlock{
    ...
    type: "heading";
    props: {
        level: "1" | "2" | "3"
    }
    ...
}
```

`level:` The heading level, representing a title (`level: "1"`), heading (`level: "2"`), and subheading (`level: "3"`).

### Bullet List Item

**Appearance**

TODO

**Type & Props**

```
type BulletListItemBlock{
    ...
    type: "bulletListItem";
    props: {}
    ...
}
```

### Numbered List Item

**Appearance**

TODO

**Type & Props**

```
type NumberedListItemBlock{
    ...
    type: "numberedListItem";
    props: {}
    ...
}
```

## Custom Block Types

### Coming Soon!
