---
title: Alert Block
description: In this example, we create a custom Alert block which is used to emphasize text.
imageTitle: Alert Block
path: /examples/alert-block
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Block from TipTap Node

In this example, we create a custom block from TipTap's Image node.

In addition, we create a Slash Menu item which inserts the block, and add an item to the block type dropdown in the Formatting Toolbar to change to the block.

**Relevant Docs:**

- [Custom Slash Menu Item List](/docs/slash-menu#custom-slash-menu-item-list)
- [Custom Formatting Toolbar](/docs/formatting-toolbar#custom-formatting-toolbar)
- [Replacing UI Elements](/docs/ui-elements#replacing-ui-elements)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockSchema, defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  defaultBlockTypeDropdownItems,
  DefaultFormattingToolbar,
  FormattingToolbarPositioner,
  getDefaultReactSlashMenuItems,
  HyperlinkToolbarPositioner,
  ReactSlashMenuItem,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import { RiImage2Fill } from "react-icons/ri";

import { Image, imagePropSchema } from "./Image";

// The custom schema, including all default blocks and the custom Alert block
const schemaWithImage = {
  ...defaultBlockSchema,
  image: {
    propSchema: imagePropSchema,
    node: Image as any,
  },
} satisfies BlockSchema;

// Creates a slash menu item for inserting the image block
const insertImage: ReactSlashMenuItem<typeof schemaWithImage> = {
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

export default function App() {
  const editor = useBlockNote({
    blockSchema: schemaWithImage,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(schemaWithImage),
      insertImage,
    ],
  });

  return (
    <div>
      <BlockNoteView editor={editor}>
        {/*Adds image item to block type dropdown in the Formatting Toolbar*/}
        <FormattingToolbarPositioner
          editor={editor}
          formattingToolbar={(props) => (
            <DefaultFormattingToolbar
              {...props}
              blockTypeDropdownItems={[
                ...defaultBlockTypeDropdownItems,
                {
                  name: "Image",
                  type: "image",
                  props: {
                    src: "https://via.placeholder.com/1000",
                    alt: "image",
                  },
                  icon: RiImage2Fill,
                  isSelected: (block) => block.type === "image",
                },
              ]}
            />
          )}
        />
        <HyperlinkToolbarPositioner editor={editor} />
        <SlashMenuPositioner editor={editor} />
        <SideMenuPositioner editor={editor} />
      </BlockNoteView>
      {/*Button to set the current block to an image.*/}
      <button
        onClick={() => {
          editor._tiptapEditor.commands.setImage({
            src: "https://preview.redd.it/yrxq9uqd4ijb1.png?width=108&crop=smart&auto=webp&s=376c2c8b380f2d78cee5025f22a7f21631a0aa70",
          });
        }}>
        Set Image
      </button>
    </div>
  );
}
```

```typescript-vue /Image.ts
import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import {
  BlockNoteDOMAttributes,
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  blockStyles as styles,
  mergeCSSClasses,
  PropSchema,
} from "@blocknote/core";

export interface ImageOptions {
  // Blocks cannot be inline, so this option is not needed.
  // inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;

  // Each node you turn into a block should have the `domAttributes` option.
  domAttributes?: BlockNoteDOMAttributes;
  // You can also add the `editor` option if you need access to the BlockNote
  // editor instance. This is marked optional here as the Image node uses
  // `addOptions`, but the BlockNote instance will always pass itself into
  // blocks provided in the schema, so you can assume it's always defined.
  editor?: BlockNoteEditor<
    BlockSchema & { image: BlockSpec<"image", typeof imagePropSchema> }
  >;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
      }) => ReturnType;
    };
  }
}

export const inputRegex =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

// We define the prop schema here, as we want to make sure the props line up with
// the attributes we define in `addAttributes` below.
export const imagePropSchema = {
  src: {
    default: "" as const,
  },
  alt: {
    default: "" as const,
  },
  title: {
    default: "" as const,
  },
} satisfies PropSchema;

export const Image = Node.create<ImageOptions>({
  name: "image",

  // Each node you turn into a block should have `group` set to "blockContent".
  group: "blockContent",
  // Each node you turn into a block should have `content` set to "" if it
  // doesn't include a content hole/contentDOM in `renderHTML`. Otherwise, it
  // should be set to "inline*".
  content: "",

  addOptions() {
    return {
      // Once again, blocks cannot be inline, so this option is not needed.
      // inline: false,
      allowBase64: false,
      HTMLAttributes: {},

      domAttributes: undefined,
      // While the editor is not defined here, you may assume that it will be.
      editor: undefined,
    };
  },

  // Blocks cannot be inline and `group` is set to "blockContent", so this
  // is not needed.
  // inline() {
  //   return this.options.inline;
  // },

  // group() {
  //   return this.options.inline ? "inline" : "block";
  // },

  // When setting `draggable` to `false`, the block will remain draggable via
  // the drag handle. You can leave it set to `true` if you want to though.
  draggable: true,

  // Each attribute should be parsed and rendered in kebab case with a "data-"
  // prefix. The attributes should also take string values only and be defined in
  // the prop schema.
  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) =>
          attributes.src !== ""
            ? {
                "data-src": attributes.src,
              }
            : {},
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-alt"),
        renderHTML: (attributes) =>
          attributes.alt !== ""
            ? {
                "data-alt": attributes.alt,
              }
            : {},
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) =>
          attributes.title !== ""
            ? {
                "data-title": attributes.title,
              }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : 'img[src]:not([src^="data:"])',
      },
      // It's a good idea to add this rule to ensure images copied from within
      // BlockNote are parsed correctly on paste, though it may not always be
      // necessary.
      {
        tag: "div[data-content-type=" + this.name + "]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Each block's content should be wrapped in a `blockContent` element, as
    // you will see below.

    // These are DOM attributes defined by the `domAttributes` editor option that
    // should be applied to the `blockContent` element.
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {};

    // If the node were to have a content hole/contentDOM, i.e. an
    // `inlineContent` element, you would also need to apply the `inlineContent`
    // DOM attributes to it:
    // const inlineContentDOMAttributes =
    //  this.options.domAttributes?.inlineContent || {};

    return [
      // The `blockContent` element should be a `div`.
      "div",
      // The `blockContent` element should have:
      // - The node's attributes in kebab-case, with a "data-" prefix.
      // - The DOM attributes defined by the `domAttributes` editor option.
      // - The `blockContent` CSS class.
      // - the `data-content-type` attribute set to the block's/node's name.
      mergeAttributes(HTMLAttributes, {
        ...blockContentDOMAttributes,
        class: mergeCSSClasses(
          styles.blockContent,
          blockContentDOMAttributes.class
        ),
        "data-content-type": this.name,
      }),
      // This is just a regular `img` element with the node's attributes as
      // DOM attributes. Attributes with default values should not be rendered.
      [
        "img",
        mergeAttributes(
          this.options.HTMLAttributes,
          Object.fromEntries(
            Object.entries(node.attrs).filter(([_key, value]) => value !== "")
          )
        ),
      ],
    ];

    // If your node has a content hole/contentDOM, i.e. an `inlineContent`
    // element, it should be nested inside the `blockContent` element and take
    // the DOM attributes defined by the `domAttributes` editor option, as well
    // as the `inlineContent` CSS class:
    //[
    //  "p",
    //  {
    //    ...inlineContentDOMAttributes,
    //    class: mergeCSSClasses(
    //      styles.inlineContent,
    //      inlineContentDOMAttributes.class
    //    ),
    //  },
    //  0,
    //]
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          // It's not recommended to define commands on the TipTap editor.
          // However, if you want to do this, you should define the commands
          // using the BlockNote API rather than using existing TipTap commands.

          // return commands.insertContent({
          //   type: this.name,
          //   attrs: options,
          // });

          this.options.editor!.updateBlock(
            this.options.editor!.getTextCursorPosition().block,
            {
              type: "image",
              props: options,
            } as any
          );

          return true;
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;

          return { src, alt, title };
        },
      }),
    ];
  },
});
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::