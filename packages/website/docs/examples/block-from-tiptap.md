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

In this example, we create a custom `TodoListItem` block from a TipTap node.

In addition, we create a Slash Menu item which inserts an `TodoListItem` block and add a Todo List item to the block type dropdown in the Formatting Toolbar.

**Relevant Docs:**

- [Custom Slash Menu Item List](/docs/slash-menu#custom-slash-menu-item-list)
- [Custom Formatting Toolbar](/docs/formatting-toolbar#custom-formatting-toolbar) & [Components](/docs/formatting-toolbar#components)
- [Replacing UI Elements](/docs/ui-elements#replacing-ui-elements)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";

import { schemaWithTodoListItem } from "./TodoListItem";
import { slashMenuItemsWithTodoListItem } from "./insertTodoListItem";
import { CustomFormattingToolbar } from "./CustomFormattingToolbar";

export default function App() {
  const editor = useBlockNote({
    blockSchema: schemaWithTodoListItem,
    slashMenuItems: slashMenuItemsWithTodoListItem,
  });

  return (
    <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"}>
      {/*Custom Formatting Toolbar - same as default, but the block type*/}
      {/*dropdown also includes the TodoListItem block*/}
      <CustomFormattingToolbar editor={editor} />
      {/*Other toolbars & menus are defaults*/}
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
    </BlockNoteView>
  );
}
```

```typescript-vue /TodoListItem.tsx
import {
  BlockNoteEditor,
  mergeCSSClasses,
  blockStyles,
  defaultBlockSchema,
  BlockNoteDOMAttributes,
  createTipTapBlock,
  BlockSpec,
  PropSchema,
  BlockSchema,
  camelToDataKebab,
} from "@blocknote/core";
import "@blocknote/core/style.css";
import { InlineContent } from "@blocknote/react";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { Checkbox } from "@mantine/core";
import { FC, useState } from "react";

// Defines the block's props
const todoListItemPropSchema = {
  checked: {
    default: "false" as const,
    values: ["true", "false"] as const,
  },
} satisfies PropSchema;

// You should define your block using the `createTipTapBlock` function. This
// takes the same config object as TipTap's `Node.create`, but locks the `group`
// option to "blockContent" and helps with typing.
const TodoListItem = createTipTapBlock<
  "todoListItem",
  {
    editor: BlockNoteEditor<
      BlockSchema & {
        todoListItem: BlockSpec<"todoListItem", typeof todoListItemPropSchema>;
      }
    >;
    domAttributes?: BlockNoteDOMAttributes;
  }
>({
  // TipTap node name should be the same as the block name
  name: "todoListItem",
  // Content should be "inline*" or "", depending on if the block should have
  // inline content (i.e. an editable rich text field). Since we want the block
  // to have editable text, we make it "inline*".
  content: "inline*",

  // All props defined in the prop schema should be added to the node's attrs
  addAttributes() {
    return {
      checked: {
        default: "false",
        parseHTML: (element) => element.getAttribute("data-checked"),
        // All attributes should be rendered in kebab case with "data" prefix
        renderHTML: (attributes) => {
          return {
            "data-checked": attributes.checked,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      // Ensures the block is pasted properly after being copied
      {
        tag: '[data-content-type="todoListItem"]',
      },
    ];
  },

  // Even though we render the block using a node view, we still need to define
  // `renderHTML` to ensure the block is properly serialized, e.q. to the
  // clipboard.
  renderHTML({ node, HTMLAttributes }) {
    // Each block should be nested in a `blockContent` div for consistent
    // styling & structure. We need to add several attributes to this
    // `blockContent` div.
    const blockContentDOMAttributes = {
      // Attributes defined in the `domAttributes` editor option except class
      ...Object.fromEntries(
        Object.entries(this.options.domAttributes?.blockContent || {}).filter(
          ([key]) => key !== "class"
        )
      ),
      // Default `blockContent` class & class defined in the `domAttributes`
      // editor option
      class: mergeCSSClasses(
        blockStyles.blockContent,
        (this.options.domAttributes?.blockContent || {}).class
      ),
      // `data-content-type` attribute with the block name
      "data-content-type": this.name,
      // Props/node attributes in kebab-case with "data" prefix
      ...HTMLAttributes,
    };

    // Since we set the content field to "inline*", we need to make sure an
    // `InlineContent` component is rendered somewhere inside this one. We
    // also need to add several attributes to this `InlineContent` component.
    const inlineContentDOMAttributes = {
      // Attributes defined in the `domAttributes` editor option except class
      ...(this.options.domAttributes?.inlineContent || {}),
      // Default `inlineContent` class & class defined in the `domAttributes`
      // editor option
      class: mergeCSSClasses(
        blockStyles.inlineContent,
        (this.options.domAttributes?.inlineContent || {}).class
      ),
    };

    return [
      // `blockContent` div
      "div",
      blockContentDOMAttributes,
      // Checkbox
      ["input", { type: "checkbox", checked: node.attrs.checked === "true" }],
      // `inlineContent` element with content hole
      ["p", inlineContentDOMAttributes, 0],
    ];
  },

  // Since we want to define how the block is rendered using a React component,
  // and because the checkbox is interactive, we need to define a custom node
  // view. If you want to render a non-interactive block using vanilla JS, you
  // can just use the `renderHTML` option.
  addNodeView() {
    // React component that renders the block
    const TodoListItem: FC<NodeViewProps> = (props: NodeViewProps) => {
      // Each block should be nested in a `blockContent` div for consistent
      // styling & structure. We need to add several attributes to this
      // `blockContent` div.
      const blockContentDOMAttributes = {
        // Attributes defined in the `domAttributes` editor option except class
        ...Object.fromEntries(
          Object.entries(this.options.domAttributes?.blockContent || {}).filter(
            ([key]) => key !== "class"
          )
        ),
        // Default `blockContent` class & class defined in the `domAttributes`
        // editor option
        className: mergeCSSClasses(
          blockStyles.blockContent,
          (this.options.domAttributes?.blockContent || {}).class
        ),
        // `data-content-type` attribute with the block name
        "data-content-type": this.name,
        // Props/node attributes in kebab-case with "data" prefix
        ...Object.fromEntries(
          Object.entries(props.node.attrs)
            .filter(([attribute, value]) => {
              return (
                value !==
                todoListItemPropSchema[
                  attribute as keyof typeof todoListItemPropSchema
                ].default
              );
            })
            .map(([attribute, value]) => [camelToDataKebab(attribute), value])
        ),
      };

      // Since we set the content field to "inline*", we need to make sure an
      // `InlineContent` component is rendered somewhere inside this one. We
      // also need to add several attributes to this `InlineContent` component.
      const inlineContentDOMAttributes = {
        // Attributes defined in the `domAttributes` editor option except class
        ...(this.options.domAttributes?.inlineContent || {}),
        // Class defined in the `domAttributes` editor option
        className: (this.options.domAttributes?.inlineContent || {}).class,
      };

      const todoListItemWrapperStyles = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      } as const;

      const checkboxStyles = {
        marginRight: "1em",
        marginLeft: "0",
      };

      const inlineContentStyles = {
        flexGrow: "1",
      };

      // Gets BlockNote editor instance
      const editor = this.options.editor! as BlockNoteEditor<
        BlockSchema & {
          todoListItem: BlockSpec<
            "todoListItem",
            typeof todoListItemPropSchema
          >;
        }
      >;
      // Gets position of the node
      const pos =
        typeof props.getPos === "function" ? props.getPos() : undefined;
      // Gets TipTap editor instance
      const tipTapEditor = editor._tiptapEditor;
      // Gets parent blockContainer node
      const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
      // Gets block identifier
      const blockIdentifier = blockContainer.attrs.id;
      // Gets the block
      const block = editor.getBlock(blockIdentifier)!;

      const [checked, setChecked] = useState(block.props.checked === "true");

      return (
        // To not unnecessarily create more divs, we use the required
        // `NodeViewWrapper` component for the `blockContent` div
        <NodeViewWrapper {...blockContentDOMAttributes}>
          <div style={todoListItemWrapperStyles}>
            {/* Checkbox */}
            <Checkbox
              checked={checked}
              onChange={(event) => {
                setChecked(event.currentTarget.checked);
                editor.updateBlock(block, {
                  type: "todoListItem",
                  props: {
                    checked: !checked ? "true" : "false",
                  },
                });
              }}
              style={checkboxStyles}
            />
            {/* `InlineContent` component */}
            <InlineContent
              {...inlineContentDOMAttributes}
              style={inlineContentStyles}
            />
          </div>
        </NodeViewWrapper>
      );
    };

    return ReactNodeViewRenderer(TodoListItem, {
      className: blockStyles.reactNodeViewRenderer,
    });
  },
});

export const schemaWithTodoListItem = {
  ...defaultBlockSchema,
  // TipTap node name should be the same as the block name
  todoListItem: {
    propSchema: todoListItemPropSchema,
    node: TodoListItem,
  },
} satisfies BlockSchema;
```

```typescript-vue /insertTodoListItem.tsx
import {
  getDefaultReactSlashMenuItems,
  ReactSlashMenuItem,
} from "@blocknote/react";
import { RiCheckboxFill } from "react-icons/ri";

import { schemaWithTodoListItem } from "./TodoListItem";

const insertTodoListItem = {
  name: "Todo List Item",
  execute: (editor) => {
    const block = editor.getTextCursorPosition().block;
    const blockIsEmpty = block.content.length === 0;

    // Updates current block to a TodoListItem if it's empty, otherwise inserts
    // a new one below
    if (blockIsEmpty) {
      editor.updateBlock(block, { type: "todoListItem" });
    } else {
      editor.insertBlocks(
        [
          {
            type: "todoListItem",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
      editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock!);
    }
  },
  aliases: ["li", "list", "todolist", "todo list"],
  group: "Basic blocks",
  icon: <RiCheckboxFill />,
  hint: "Used to display a todo list",
} satisfies ReactSlashMenuItem<typeof schemaWithTodoListItem>;

const defaultSlashMenuItems = getDefaultReactSlashMenuItems(
  schemaWithTodoListItem
);
export const slashMenuItemsWithTodoListItem = [
  defaultSlashMenuItems[0],
  defaultSlashMenuItems[1],
  defaultSlashMenuItems[2],
  defaultSlashMenuItems[3],
  defaultSlashMenuItems[4],
  insertTodoListItem,
  defaultSlashMenuItems[5],
] satisfies ReactSlashMenuItem<typeof schemaWithTodoListItem>[];
```

```typescript-vue /CustomBlockTypeDropdown.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  ToolbarDropdown,
  ToolbarDropdownProps,
  useEditorContentChange,
  useEditorSelectionChange,
} from "@blocknote/react";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import {
  RiCheckboxFill,
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { schemaWithTodoListItem } from "./TodoListItem";

// Code modified from `BlockTypeDropdown.tsx` in @blocknote/react
// Changed to use a single schema and added alert to dropdown.
type HeadingLevels = "1" | "2" | "3";

const headingIcons: Record<HeadingLevels, IconType> = {
  "1": RiH1,
  "2": RiH2,
  "3": RiH3,
};

export const CustomBlockTypeDropdown = (props: {
  editor: BlockNoteEditor<typeof schemaWithTodoListItem>;
}) => {
  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  const dropdownItems: ToolbarDropdownProps["items"] = useMemo(() => {
    return [
      {
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: "paragraph",
            props: {},
          });
        },
        text: "Paragraph",
        icon: RiText,
        isSelected: block.type === "paragraph",
      },
      ...(["1", "2", "3"] as const).map((level) => ({
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: "heading",
            props: { level: level },
          });
        },
        text: "Heading " + level,
        icon: headingIcons[level],
        isSelected: block.type === "heading" && block.props.level === level,
      })),
      {
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: "bulletListItem",
            props: {},
          });
        },
        text: "Bullet List",
        icon: RiListUnordered,
        isSelected: block.type === "bulletListItem",
      },
      {
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: "numberedListItem",
            props: {},
          });
        },
        text: "Numbered List",
        icon: RiListOrdered,
        isSelected: block.type === "numberedListItem",
      },
      {
        onClick: () => {
          props.editor.focus();
          props.editor.updateBlock(block, {
            type: "todoListItem",
            props: {},
          });
        },
        text: "Todo List",
        icon: RiCheckboxFill,
        isSelected: block.type === "todoListItem",
      },
    ];
  }, [block, props.editor]);

  useEditorContentChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  useEditorSelectionChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  return <ToolbarDropdown items={dropdownItems} />;
};
```

```typescript-vue /CustomFormattingToolbar.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbarPositioner,
  NestBlockButton,
  TextAlignButton,
  ToggledStyleButton,
  Toolbar,
  UnnestBlockButton,
} from "@blocknote/react";

import { CustomBlockTypeDropdown } from "./CustomBlockTypeDropdown";
import { schemaWithTodoListItem } from "./TodoListItem";

// Code modified from `DefaultFormattingToolbar.tsx` in @blocknote/react
// Replaced default dropdown with one that includes our custom Alert block.
export const CustomFormattingToolbar = (props: {
  editor: BlockNoteEditor<typeof schemaWithTodoListItem>;
}) => {
  return (
    <FormattingToolbarPositioner
      editor={props.editor}
      formattingToolbar={(props) => (
        <Toolbar>
          <CustomBlockTypeDropdown {...props} />

          <ToggledStyleButton editor={props.editor} toggledStyle={"bold"} />
          <ToggledStyleButton editor={props.editor} toggledStyle={"italic"} />
          <ToggledStyleButton
            editor={props.editor}
            toggledStyle={"underline"}
          />
          <ToggledStyleButton editor={props.editor} toggledStyle={"strike"} />

          <TextAlignButton
            editor={props.editor as any}
            textAlignment={"left"}
          />
          <TextAlignButton
            editor={props.editor as any}
            textAlignment={"center"}
          />
          <TextAlignButton
            editor={props.editor as any}
            textAlignment={"right"}
          />

          <ColorStyleButton editor={props.editor} />

          <NestBlockButton editor={props.editor} />
          <UnnestBlockButton editor={props.editor} />

          <CreateLinkButton editor={props.editor} />
        </Toolbar>
      )}></FormattingToolbarPositioner>
  );
};
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::