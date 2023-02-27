# Block types

This page will explain:

- list all built-in blocks + examples
- shortcuts & different behaviour?
- explain props
- creating your own block types: Coming Soon!

## Default Block Types

There are a variety of default block types that can be used in BlockNote, which are listed below along with how they're represented using a `Block` object.

### Paragraph

**Appearance**

TODO

**Type & Props**

```typescript
type ParagraphBlock = {
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

```typescript
type HeadingBlock = {
    ...
    type: "heading";
    props: {
        level: "1" | "2" | "3" = "1"
    }
    ...
}
```

`level:` The heading level, representing a title (`level: "1"`), heading (`level: "2"`), and subheading (`level: "3"`).

### Bullet List Item

**Appearance**

TODO

**Type & Props**

```typescript
type BulletListItemBlock = {
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

```typescript
type NumberedListItemBlock = {
    ...
    type: "numberedListItem";
    props: {}
    ...
}
```

## Custom Block Types

### Coming Soon!
