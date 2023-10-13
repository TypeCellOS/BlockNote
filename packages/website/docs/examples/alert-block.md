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

# Alert Block

In this example, we create a custom `Alert` block which is used to emphasize text.

In addition, we create a Slash Menu item which inserts an `Alert` block and add an Alert item to the block type dropdown in the Formatting Toolbar.

**Relevant Docs:**

- [Custom Block Types](/docs/block-types#custom-block-types)
- [Custom Slash Menu Item List](/docs/slash-menu#custom-slash-menu-item-list)
- [Custom Formatting Toolbar](/docs/formatting-toolbar#custom-formatting-toolbar) & [Components](/docs/formatting-toolbar#components)
- [Replacing UI Elements](/docs/ui-elements#replacing-ui-elements)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  defaultBlockTypeDropdownItems,
  DefaultFormattingToolbar,
  FormattingToolbarPositioner,
  getDefaultReactSlashMenuItems,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import { RiAlertFill } from "react-icons/ri";

import { createAlertBlock, insertAlert } from "./Alert";

// The custom schema, including all default blocks and the custom Alert block
export const schemaWithAlert = {
  ...defaultBlockSchema,
  alert: createAlertBlock("{{ getTheme(isDark) }}"),
};

export default function App() {
  const editor = useBlockNote({
    blockSchema: schemaWithAlert,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(schemaWithAlert),
      insertAlert,
    ],
  });

  return (
    <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"}>
      {/*Adds alert item to block type dropdown in the Formatting Toolbar*/}
      <FormattingToolbarPositioner
        editor={editor}
        formattingToolbar={(props) => (
          <DefaultFormattingToolbar
            {...props}
            blockTypeDropdownItems={[
              ...defaultBlockTypeDropdownItems,
              {
                name: "Alert",
                type: "alert",
                icon: RiAlertFill,
                isSelected: (block) => block.type === "alert",
              },
            ]}
          />
        )}
      />
      {/*Other toolbars & menus are defaults*/}
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} />
    </BlockNoteView>
  );
}
```

```typescript /Alert.tsx
import {
  BlockNoteEditor,
  BlockSpec,
  DefaultBlockSchema,
  defaultProps,
  PropSchema,
  SpecificBlock,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  InlineContent,
  ReactSlashMenuItem,
} from "@blocknote/react";
import { RiAlertFill } from "react-icons/ri";
import { MdCancel, MdCheckCircle, MdError, MdInfo } from "react-icons/md";
import { Menu } from "@mantine/core";

// The types of alerts that users can choose from
export const alertTypes = {
  warning: {
    icon: MdError,
    color: "#e69819",
    backgroundColor: {
      light: "#fff6e6",
      dark: "#805d20",
    },
  },
  error: {
    icon: MdCancel,
    color: "#d80d0d",
    backgroundColor: {
      light: "#ffe6e6",
      dark: "#802020",
    },
  },
  info: {
    icon: MdInfo,
    color: "#507aff",
    backgroundColor: {
      light: "#e6ebff",
      dark: "#203380",
    },
  },
  success: {
    icon: MdCheckCircle,
    color: "#0bc10b",
    backgroundColor: {
      light: "#e6ffe6",
      dark: "#208020",
    },
  },
} as const;

// The props for the Alert block
export const alertPropSchema = {
  textAlignment: defaultProps.textAlignment,
  textColor: defaultProps.textColor,
  type: {
    default: "warning" as const,
    values: ["warning", "error", "info", "success"] as const,
  },
} satisfies PropSchema;

// Component for the Alert block
export const Alert = (props: {
  block: SpecificBlock<
    DefaultBlockSchema & {
    alert: BlockSpec<"alert", typeof alertPropSchema, true>;
  },
    "alert"
  >;
  editor: BlockNoteEditor<
    DefaultBlockSchema & {
    alert: BlockSpec<"alert", typeof alertPropSchema, true>;
  }
  >;
  theme: "light" | "dark";
}) => {
  const Icon = alertTypes[props.block.props.type].icon;

  return (
    <div
      className={"alert"}
      style={{
        ...alertStyles,
        backgroundColor:
          alertTypes[props.block.props.type].backgroundColor[props.theme],
      }}>
      {/*Icon which opens a menu to choose the Alert type*/}
      <Menu zIndex={99999}>
        <Menu.Target>
          {/*Icon wrapper to change the color*/}
          <div
            className={"alert-icon-wrapper"}
            style={{
              ...alertIconWrapperStyles,
              backgroundColor: alertTypes[props.block.props.type].color,
            }}
            contentEditable={false}>
            {/*Icon itself*/}
            <Icon
              className={"alert-icon"}
              style={{
                color:
                  alertTypes[props.block.props.type].backgroundColor[
                    props.theme
                  ],
              }}
              size={32}
            />
          </div>
        </Menu.Target>
        {/*Dropdown to change the Alert type*/}
        <Menu.Dropdown>
          <Menu.Label>Alert Type</Menu.Label>
          <Menu.Divider />
          {Object.entries(alertTypes).map(([key, value]) => {
            const ItemIcon = value.icon;
            
            return (
              <Menu.Item
                key={key}
                icon={<ItemIcon color={value.color} />}
                onClick={() =>
                  props.editor.updateBlock(props.block, {
                    type: "alert",
                    props: { type: key as keyof typeof alertTypes },
                  })
                }>
                {key.slice(0, 1).toUpperCase() + key.slice(1)}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
      {/*Rich text field for user to type in*/}
      <InlineContent style={inlineContentStyles} />
    </div>
  );
};

// Function which creates the Alert block itself, where the component is styled
// correctly with the light & dark theme
export const createAlertBlock = (theme: "light" | "dark") =>
  createReactBlockSpec<
    "alert",
    typeof alertPropSchema,
    true,
    DefaultBlockSchema & {
      alert: BlockSpec<"alert", typeof alertPropSchema, true>;
    }
  >({
    type: "alert" as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"],
      },
    } as const,
    containsInlineContent: true,
    render: (props) => <Alert {...props} theme={theme} />,
  });

// Slash menu item to insert an Alert block
export const insertAlert = {
  name: "Alert",
  execute: (editor) => {
    const block = editor.getTextCursorPosition().block;
    const blockIsEmpty = block.content!.length === 0;

    // Updates current block to an Alert if it's empty, otherwise inserts a new
    // one below
    if (blockIsEmpty) {
      editor.updateBlock(block, { type: "alert" });
    } else {
      editor.insertBlocks(
        [
          {
            type: "alert",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
      editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock!);
    }
  },
  aliases: [
    "alert",
    "notification",
    "emphasize",
    "warning",
    "error",
    "info",
    "success",
  ],
  group: "Other",
  icon: <RiAlertFill />,
  hint: "Used to emphasize text",
} satisfies ReactSlashMenuItem<
  DefaultBlockSchema & {
    alert: BlockSpec<"alert", typeof alertPropSchema, true>;
  }
>;

const alertStyles = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexGrow: 1,
  borderRadius: "4px",
  height: "48px",
  padding: "4px",
} as const;

const alertIconWrapperStyles = {
  borderRadius: "16px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: "12px",
  marginRight: "12px",
  height: "18px",
  width: "18px",
  userSelect: "none",
  cursor: "pointer",
} as const;

const inlineContentStyles = {
  flexGrow: "1",
};
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::