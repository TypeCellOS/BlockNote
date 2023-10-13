---
title: Block Types & Properties
description: A block's type affects how it looks and behaves in the editor. Each type also comes with its own set of properties, which further affect the block's appearance and behaviour.
imageTitle: Block Types & Properties
path: /docs/block-types
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Block Types & Properties

A block's type affects how it looks and behaves in the editor. Each type also comes with its own set of properties, each having a string value, which further affect the block's appearance and behaviour.

## Built-In Block Types

BlockNote includes a number of built-in block types, each with their own set of properties. You can see how they look, both in the editor, and in code using `Block` objects:

### Paragraph

**Appearance**

<img :src="isDark ? '/img/screenshots/paragraph_type_dark.png' : '/img/screenshots/paragraph_type.png'" alt="image" style="height: 29px">

**Type & Props**

```typescript
type ParagraphBlock = {
  id: string;
  type: "paragraph";
  props: DefaultProps;
  content: InlineContent[];
  children: Block[];
};
```

### Heading

**Appearance**

<img :src="isDark ? '/img/screenshots/heading_type_dark.png' : '/img/screenshots/heading_type.png'" alt="image" style="height: 77px">

**Type & Props**

```typescript
type HeadingBlock = {
  id: string;
  type: "heading";
  props: {
    level: 1 | 2 | 3 = 1;
  } & DefaultProps;
  content: InlineContent[];
  children: Block[];
};
```

`level:` The heading level, representing a title (`level: 1`), heading (`level: 2`), and subheading (`level: 3`).

### Bullet List Item

**Appearance**

<img :src="isDark ? '/img/screenshots/bullet_list_item_type_dark.png' : '/img/screenshots/bullet_list_item_type.png'" alt="image" style="height: 29px">

**Type & Props**

```typescript
type BulletListItemBlock = {
  id: string;
  type: "bulletListItem";
  props: DefaultProps;
  content: InlineContent[];
  children: Block[];
};
```

### Numbered List Item

**Appearance**

<img :src="isDark ? '/img/screenshots/numbered_list_item_type_dark.png' : '/img/screenshots/numbered_list_item_type.png'" alt="image" style="height: 29px">

**Type & Props**

```typescript
type NumberedListItemBlock = {
  id: string;
  type: "numberedListItem";
  props: DefaultProps;
  content: InlineContent[];
  children: Block[];
};
```

### Image

**Appearance**

<img :src="isDark ? '/img/screenshots/image_type_dark.png' : '/img/screenshots/image_type.png'" alt="image" style="width: 100%">

**Type & Props**

```typescript
type ImageBlock = {
  id: string;
  type: "image";
  props: {
    url: string = "",
    caption: string = "",
    width: number = 512;
  } & Omit<DefaultProps, "textAlignment">
  content: InlineContent[];
  children: Block[];
};
```

`url:` The image URL.

`caption:` The image caption.

`width:` The image width in pixels.

## Default Block Properties

While each type of block can have its own set of properties, there are some properties that all built-in block types have by default, which you can find in the definition for `DefaultProps`:

```typescript
type DefaultProps = {
  backgroundColor: string = "default";
  textColor: string = "default";
  textAlignment: "left" | "center" | "right" | "justify" = "left";
};
```

`backgroundColor:` The background color of the block, which also applies to nested blocks.

`textColor:` The text color of the block, which also applies to nested blocks.

`textAlignment:` The text alignment of the block.

## Custom Block Types

In addition to the default block types that BlockNote offers, you can also make your own custom blocks. Take a look at the demo below, in which we add a custom block containing an image and caption to a BlockNote editor, as well as a custom [Slash Menu Item](/docs/slash-menu#custom-items) to insert it.

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  defaultBlockSchema,
  defaultProps,
} from "@blocknote/core";
import {
  BlockNoteView,
  useBlockNote,
  createReactBlockSpec,
  InlineContent,
  ReactSlashMenuItem,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import "@blocknote/core/style.css";
import { RiImage2Fill } from "react-icons/ri";

export default function App() {
  // Creates a custom image block.
  const ImageBlock = createReactBlockSpec({
    type: "image",
    propSchema: {
      ...defaultProps,
      src: {
        default: "https://via.placeholder.com/1000",
      },
      alt: {
        default: "image",
      },
    },
    containsInlineContent: true,
    render: ({ block }) => (
      <div id="image-wrapper">
        <img
          src={block.props.src}
          alt={block.props.alt}
          contentEditable={false}
        />
        <InlineContent />
      </div>
    ),
  });

  // The custom schema, which includes the default blocks and the custom image
  // block.
  const customSchema = {
    // Adds all default blocks.
    ...defaultBlockSchema,
    // Adds the custom image block.
    image: ImageBlock,
  } satisfies BlockSchema;

  // Creates a slash menu item for inserting an image block.
  const insertImage: ReactSlashMenuItem<typeof customSchema> = {
    name: "Insert Image",
    execute: (editor) => {
      const src: string | null = prompt("Enter image URL");
      const alt: string | null = prompt("Enter image alt text");

      editor.insertBlocks(
        [
          {
            type: "image",
            props: {
              src: src || "https://via.placeholder.com/1000",
              alt: alt || "image",
            },
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    aliases: ["image", "img", "picture", "media"],
    group: "Media",
    icon: <RiImage2Fill />,
    hint: "Insert an image",
  };

  // Creates a new editor instance.
  const editor = useBlockNote({
    // Tells BlockNote which blocks to use.
    blockSchema: customSchema,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(customSchema),
      insertImage,
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

#image-wrapper {
  display: "flex";
  flexDirection: "column";
}

img {
  width: 100%;
}
```

:::

::: info
While custom blocks open a lot of doors for what you can do with BlockNote, we're still working on the API and there are a few limitations for the kinds of blocks you can create.

We'd love to hear your feedback on GitHub or in our Discord community!
:::

### Creating a Custom Block Type

To define a custom block type, we use the `createReactBlockSpec` function, for which you can see the definition below:

```typescript
type PropSchema = Record<
  string,
  {
    default: string;
    values?: string[];
  };
>

function createReactBlockSpec(config: {
  type: string;
  propSchema: PropSchema;
  containsInlineContent: boolean;
  render: (props: {
    block: Block,
    editor: BlockNoteEditor
  }) => JSX.Element;
}): BlockType;
```

Let's look at our custom image block from the demo, and go over each field in-depth to explain how it works:

```typescript jsx
const ImageBlock = createReactBlockSpec({
  type: "image",
  propSchema: {
    src: {
      default: "https://via.placeholder.com/1000",
    },
  },
  containsInlineContent: true,
  render: ({ block }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}>
      <img
        style={{
          width: "100%",
        }}
        src={block.props.src}
        alt={"Image"}
        contentEditable={false}
      />
      <InlineContent />
    </div>
  ),
});
```

#### `type`

Defines the name of the block, in this case, `image`.

#### `propSchema`

This is an object which defines the props that the block should have. In this case, we want the block to have a `src` prop for the URL of the image, so we add a `src` key. We also want basic styling options for the image block, so we also add the [Default Block Properties](/docs/block-types#default-block-properties) using `defaultProps`. The value of each key is an object with a mandatory `default` field and an optional `values` field:

`default:` Stores the prop's default value, so we use a placeholder image URL for `src` if no URL is provided.

`values:` Stores an array of strings that the prop can take. If `values` is not defined, BlockNote assumes the prop can be any string, which makes sense for `src`, since it can be any image URL.

#### `containsInlineContent`

As we saw in [Block Objects](/docs/blocks#block-objects), blocks can contain editable rich text which is represented as [Inline Content](/docs/inline-content). The `containsInlineContent` field allows your custom block to contain an editable rich-text field. For the custom image block, we use an inline content field to create our caption, so it's set to `true`.

#### `render`

This is a React component which defines how your custom block should be rendered in the editor, and takes two props:

`block:` The block that should be rendered.

`editor:` The BlockNote editor instance that the block is in.

For our custom image block, we use a parent `div` which contains the image and caption. Since `block` will always be an `image` block, we also know it contains a `src` prop, and can pass it to the child `img` element.

But what's this `InlineContent` component? Since we set `containsInlineContent` to `true`, it means we want to include an editable rich-text field somewhere in the image block. You should use the `InlineContent` component to represent this field in your `render` component. Since we're using it to create our caption, we add it below the `img` element.

In the DOM, the `InlineContent` component is rendered as a `div` by default, but you can make it use a different element by passing `as={"elementTag"}` as a prop. For example, `as={"p"}` will make the `InlineContent` component get rendered to a paragraph.

While the `InlineContent` component can be put anywhere inside the component you pass to `render`, you should make sure to only have one. If `containsInlineContent` is set to false, `render` shouldn't contain any.

### Adding Custom Blocks to the Editor

Now, we need to tell BlockNote to use our custom image block by passing it to the editor in the `blockSchema` option. Let's again look at the image block from the demo as an example:

```typescript jsx
// Creates a new editor instance.
const editor = useBlockNote({
  // Tells BlockNote which blocks to use.
  blockSchema: {
    // Adds all default blocks.
    ...defaultBlockSchema,
    // Adds the custom image block.
    image: ImageBlock,
  },
});
```

Since we still want the editor to use the [Built-In Block Types](/docs/block-types#built-in-block-types), we add `defaultBlockSchema` to our custom block schema. The key which we use for the custom image block is the same string we use for its type. Make sure that this is always the case for your own custom blocks.

And we're done! You now know how to create custom blocks and add them to the editor. Head to [Manipulating Blocks](/docs/manipulating-blocks) to see what you can do with them in the editor.
