import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchema,
  CustomBlockConfig,
  defaultBlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  defaultProps,
  DefaultStyleSchema,
} from "@blocknote/core";
import { createReactBlockSpec, ReactSlashMenuItem } from "@blocknote/react";
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

const alertBlockConfig = {
  type: "alert" as const,
  propSchema: {
    textAlignment: defaultProps.textAlignment,
    textColor: defaultProps.textColor,
    type: {
      default: "warning",
      values: ["warning", "error", "info", "success"],
    },
  } as const,
  content: "inline",
} satisfies CustomBlockConfig;

const blockSchema = {
  ...defaultBlockSchema,
  alert: alertBlockConfig,
} satisfies BlockSchema;

// Component for the Alert block
export const Alert = (props: {
  block: BlockFromConfig<
    typeof alertBlockConfig,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  >;
  editor: BlockNoteEditor<typeof blockSchema>;
  contentRef: (node: HTMLElement | null) => void;
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
      <div ref={props.contentRef} style={inlineContentStyles} />
    </div>
  );
};

// Function which creates the Alert block itself, where the component is styled
// correctly with the light & dark theme
export const createAlertBlock = (theme: "light" | "dark") =>
  createReactBlockSpec(alertBlockConfig, {
    render: (props) => <Alert {...props} theme={theme} />,
  });

// Slash menu item to insert an Alert block
export const insertAlert = {
  name: "Alert",
  execute: (editor) => {
    const block = editor.getTextCursorPosition().block;
    const blockIsEmpty =
      Array.isArray(block) && (block.content as any[]).length === 0;

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
    alert: any;
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
