import { c, combinatorContentType } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { Menu } from "@mantine/core";
import { MdCancel, MdCheckCircle, MdError, MdInfo } from "react-icons/md";

import "./styles.css";

// The variants of alert that users can choose from.
export const alertVariants = [
  { value: "warning", title: "Warning", icon: MdError },
  { value: "error", title: "Error", icon: MdCancel },
  { value: "info", title: "Info", icon: MdInfo },
  { value: "success", title: "Success", icon: MdCheckCircle },
] as const;

// The content schema: a record of two named inline regions. The block's
// `content` JSON shape is automatically derived as
// `{ title: InlineContent[]; body: InlineContent[] }`.
const alertContentType = combinatorContentType(
  "alert",
  c.record({
    title: c.inline(),
    body: c.inline(),
  }),
);

export const createAlert = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      variant: {
        default: "warning",
        values: ["warning", "error", "info", "success"] as const,
      },
    },
    content: alertContentType,
  },
  {
    render: (props) => {
      const variant =
        alertVariants.find((v) => v.value === props.block.props.variant) ??
        alertVariants[0];
      const Icon = variant.icon;

      return (
        <div
          className="alert"
          data-alert-variant={props.block.props.variant}>
          {/* Icon — non-editable; opens a menu to change the variant. */}
          <Menu withinPortal={false}>
            <Menu.Target>
              <div className="alert-icon-wrapper" contentEditable={false}>
                <Icon
                  className="alert-icon"
                  data-alert-icon-variant={props.block.props.variant}
                  size={28}
                />
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Alert variant</Menu.Label>
              <Menu.Divider />
              {alertVariants.map((v) => {
                const ItemIcon = v.icon;
                return (
                  <Menu.Item
                    key={v.value}
                    leftSection={
                      <ItemIcon
                        className="alert-icon"
                        data-alert-icon-variant={v.value}
                      />
                    }
                    onClick={() =>
                      props.editor.updateBlock(props.block, {
                        type: "alert",
                        props: { variant: v.value },
                      })
                    }>
                    {v.title}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
          {/*
            Content slots: the parent record's children (title + body) mount
            as siblings inside this element. Each slot is a real ProseMirror
            node, identified by `data-content-name="alert__<field>"`, which we
            target with CSS to give title and body distinct styling.
          */}
          <div className="alert-slots" ref={props.contentRef} />
        </div>
      );
    },
  },
);
