# Block Types & Properties

This page will explain:

- list all built-in blocks + examples
- shortcuts & different behaviour?
- explain props
- creating your own block types: Coming Soon!

## Block Types

BlockNote includes a variety of built-in block types, each with their own set of type-specific properties. You can see how they look, both in the editor, and in code using `Block` objects:

### Paragraph

**Appearance**

<img src="../public/img/screenshots/paragraph_type.png" alt="image" style="height: 29px">

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

<img src="../public/img/screenshots/heading_type.png" alt="image" style="height: 77px">

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

<img src="../public/img/screenshots/bullet_list_item_type.png" alt="image" style="height: 29px">

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

<img src="../public/img/screenshots/numbered_list_item_type.png" alt="image" style="height: 29px">

**Type & Props**

```typescript
type NumberedListItemBlock = {
...
    type: "numberedListItem";
    props: {}
...
}
```

## Universal Properties

While each type of block can have its own set of properties, there are some properties that all block types have. These are known as universal properties, and are listed below:

```typescript
type UniversalProps = {
  backgroundColor: string = "default";
  textColor: string = "default";
  textAlignment: "left" | "center" | "right" | "justify" = "left"
}
```

`backgroundColor:` The background color of the block, which also applies to nested blocks.

`textColor:` The text color of the block, which also applies to nested blocks.

`textAlignment:` The text alignment of the block.

Since all block types have these properties, the full definition of `props` for a heading block, for example, looks like this:

```typescript
type HeadingBlock = {
...
    type: "heading";
    props: {
      // Universal props
      backgroundColor: string = "default";
      textColor: string = "default";
      textAlignment: "left" | "center" | "right" | "justify" = "left"
      
      // Type-specific props
      level: "1" | "2" | "3" = "1"
    }
...
}
```

## Custom Block Types

### Coming Soon!
