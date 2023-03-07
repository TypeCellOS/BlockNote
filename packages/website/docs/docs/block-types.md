# Block Types & Properties

A block's type affects how it looks and behaves in the editor. Each type also comes with its own set of properties, which further affect the block's appearance and behaviour.

## Built-In Block Types

BlockNote includes a number of built-in block types, each with their own set of properties. You can see how they look, both in the editor, and in code using `Block` objects:

### Paragraph

**Appearance**

<img src="../public/img/screenshots/paragraph_type.png" alt="image" style="height: 29px">

**Type & Props**

```typescript
type ParagraphBlock = {
  id: string;
  type: "paragraph";
  props: DefaultBlockProps;
  content: InlineContent[];
  children: Block[];
};
```

### Heading

**Appearance**

<img src="../public/img/screenshots/heading_type.png" alt="image" style="height: 77px">

**Type & Props**

```typescript
type HeadingBlock = {
  id: string;
  type: "heading";
  props: {
    level: "1" | "2" | "3" = "1";
  } & DefaultBlockProps;
  content: InlineContent[];
  children: Block[];
};
```

`level:` The heading level, representing a title (`level: "1"`), heading (`level: "2"`), and subheading (`level: "3"`).

### Bullet List Item

**Appearance**

<img src="../public/img/screenshots/bullet_list_item_type.png" alt="image" style="height: 29px">

**Type & Props**

```typescript
type BulletListItemBlock = {
  id: string;
  type: "bulletListItem";
  props: DefaultBlockProps;
  content: InlineContent[];
  children: Block[];
};
```

### Numbered List Item

**Appearance**

<img src="../public/img/screenshots/numbered_list_item_type.png" alt="image" style="height: 29px">

**Type & Props**

```typescript
type NumberedListItemBlock = {
  id: string;
  type: "numberedListItem";
  props: DefaultBlockProps;
  content: InlineContent[];
  children: Block[];
};
```

## Default Block Properties

While each type of block can have its own set of properties, there are some properties that all block types have by default, which you can find in the definition for `DefaultBlockProps`:

```typescript
type DefaultBlockProps = {
  backgroundColor: string = "default";
  textColor: string = "default";
  textAlignment: "left" | "center" | "right" | "justify" = "left";
};
```

`backgroundColor:` The background color of the block, which also applies to nested blocks.

`textColor:` The text color of the block, which also applies to nested blocks.

`textAlignment:` The text alignment of the block.

## Custom Block Types

### Coming Soon!
