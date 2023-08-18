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

Finally, we add some theme-based styling to make our new block work nicely for both light and dark mode users.

**Relevant Docs:**

- [Custom Block Types](/docs/block-types#custom-block-types)
- [Custom Slash Menu Item List](/docs/slash-menu#custom-slash-menu-item-list)
- [Custom Formatting Toolbar](/docs/formatting-toolbar#custom-formatting-toolbar) & [Components](/docs/formatting-toolbar#components)
- [Replacing UI Elements](/docs/ui-elements#replacing-ui-elements)
- [Advanced: Overriding CSS](/docs/theming#advanced-overriding-css)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  darkDefaultTheme,
  getDefaultReactSlashMenuItems,
  HyperlinkToolbarPositioner,
  lightDefaultTheme,
  SideMenuPositioner,
  SlashMenuPositioner,
  Theme,
  useBlockNote,
} from "@blocknote/react";
import { insertAlert, schemaWithAlert } from "./Alert";
import { CustomFormattingToolbar } from "./CustomFormattingToolbar";

// Ensures the Alert background color is correct for both light & dark theme
const componentStyles: Theme["componentStyles"] = (theme) => ({
  Editor: {
    ".alert": {
      backgroundColor: theme.colors.hovered.background,
      ".alert-icon": {
        color: theme.colors.hovered.background,
      },
    },
  },
});

// Adds the theme-dependent Alert styles to the default theme
const theme = {
  light: {
    ...lightDefaultTheme,
    componentStyles: componentStyles,
  } satisfies Theme,
  dark: {
    ...darkDefaultTheme,
    componentStyles: componentStyles,
  } satisfies Theme,
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
    // Theme is applied to the editor
    <BlockNoteView editor={editor} theme={theme}>
      {/*Custom Formatting Toolbar - same as default, but the block type*/}
      {/*dropdown also includes the Alert block*/}
      <CustomFormattingToolbar editor={editor} />
      {/*Other toolbars & menus are defaults*/}
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
    </BlockNoteView>
  );
}
```

```typescript-vue /Alert.tsx
import {
  BlockNoteEditor,
  BlockSpec,
  defaultBlockSchema,
  DefaultBlockSchema,
  defaultProps,
  PropSchema,
  SpecificBlock,
} from "@blocknote/core";
import { useState } from "react";
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
  },
  error: {
    icon: MdCancel,
    color: "#d80d0d",
  },
  info: {
    icon: MdInfo,
    color: "#507aff",
  },
  success: {
    icon: MdCheckCircle,
    color: "#0bc10b",
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
    DefaultBlockSchema & { alert: BlockSpec<"alert", typeof alertPropSchema> },
    "alert"
  >;
  editor: BlockNoteEditor<
    DefaultBlockSchema & { alert: BlockSpec<"alert", typeof alertPropSchema> }
  >;
}) => {
  const [type, setType] = useState(props.block.props.type);
  const Icon = alertTypes[type].icon;

  const alertStyles = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    borderRadius: "20px",
    padding: "4px",
  } as const;

  const alertWrapperStyles = {
    backgroundColor: alertTypes[type].color,
    borderRadius: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: "0.5rem",
    height: "32px",
    width: "32px",
    userSelect: "none",
    cursor: "pointer",
  } as const;

  const inlineContentStyles = {
    flexGrow: "1",
  };

  return (
    <div className={"alert"} style={alertStyles}>
      {/*Icon which opens a menu to choose the Alert type*/}
      <Menu>
        <Menu.Target>
          <div
            className={"alert-icon-wrapper"}
            style={alertWrapperStyles}
            contentEditable={false}>
            <Icon className={"alert-icon"} size={32} />
          </div>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Alert Type</Menu.Label>
          <Menu.Divider />
          {Object.entries(alertTypes).map(([key, value]) => {
            const ItemIcon = value.icon;

            return (
              <Menu.Item
                key={key}
                icon={<ItemIcon color={value.color} />}
                onClick={() => setType(key as keyof typeof alertTypes)}>
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

// The Alert block itself
export const AlertBlock = createReactBlockSpec({
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
  render: Alert,
});

// Slash menu item to insert an Alert block
export const insertAlert = {
  name: "Alert",
  execute: (editor) => {
    const block = editor.getTextCursorPosition().block;
    const blockIsEmpty = block.content.length === 0;

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
  DefaultBlockSchema & { alert: BlockSpec<"alert", typeof alertPropSchema> }
>;

// The custom schema, including all default blocks and the custom Alert block
export const schemaWithAlert = {
  ...defaultBlockSchema,
  alert: AlertBlock,
};
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
  RiAlertFill,
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import { schemaWithAlert } from "./Alert";

// Code modified from `BlockTypeDropdown.tsx` in @blocknote/react
// Changed to use a single schema and added alert to dropdown.
type HeadingLevels = "1" | "2" | "3";

const headingIcons: Record<HeadingLevels, IconType> = {
  "1": RiH1,
  "2": RiH2,
  "3": RiH3,
};

export const CustomBlockTypeDropdown = (props: {
  editor: BlockNoteEditor<typeof schemaWithAlert>;
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
            type: "alert",
            props: {},
          });
        },
        text: "Alert",
        icon: RiAlertFill,
        isSelected: block.type === "alert",
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
import { schemaWithAlert } from "./Alert";

// Code modified from `DefaultFormattingToolbar.tsx` in @blocknote/react
// Replaced default dropdown with one that includes our custom Alert block.
export const CustomFormattingToolbar = (props: {
  editor: BlockNoteEditor<typeof schemaWithAlert>;
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