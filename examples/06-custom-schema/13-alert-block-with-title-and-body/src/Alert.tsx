import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { Menu } from "@mantine/core";
import { MdCancel, MdCheckCircle, MdError, MdInfo } from "react-icons/md";

import "./styles.css";

// The types of alerts that users can choose from.
export const alertTypes = [
  {
    title: "Warning",
    value: "warning",
    icon: MdError,
    color: "#e69819",
    backgroundColor: {
      light: "#fff6e6",
      dark: "#805d20",
    },
  },
  {
    title: "Error",
    value: "error",
    icon: MdCancel,
    color: "#d80d0d",
    backgroundColor: {
      light: "#ffe6e6",
      dark: "#802020",
    },
  },
  {
    title: "Info",
    value: "info",
    icon: MdInfo,
    color: "#507aff",
    backgroundColor: {
      light: "#e6ebff",
      dark: "#203380",
    },
  },
  {
    title: "Success",
    value: "success",
    icon: MdCheckCircle,
    color: "#0bc10b",
    backgroundColor: {
      light: "#e6ffe6",
      dark: "#208020",
    },
  },
] as const;

// The Alert block, with a title (its text) and a body (its child blocks).
export const createAlert = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"],
      },
    },
    content: "inline",
  },
  {
    // Keeps the body inside the alert: Enter in the title adds a first child
    // block, child blocks can't be outdented out of the alert, and Enter in an
    // empty last child block leaves the alert.
    experimental_keyboard: {
      enter: "into-children",
      childrenCanOutdent: false,
      emptyChildEnter: "exit-at-end",
    },
    // The title row. The child blocks (the body) go below it.
    render: (props) => {
      const alertType = alertTypes.find(
        (a) => a.value === props.block.props.type,
      )!;
      const Icon = alertType.icon;
      return (
        <div className={"alert-title-row"}>
          {/*Icon which opens a menu to choose the Alert type*/}
          <Menu withinPortal={false}>
            <Menu.Target>
              <div className={"alert-icon-wrapper"} contentEditable={false}>
                <Icon
                  className={"alert-icon"}
                  data-alert-icon-type={props.block.props.type}
                  size={32}
                />
              </div>
            </Menu.Target>
            {/*Dropdown to change the Alert type*/}
            <Menu.Dropdown>
              <Menu.Label>Alert Type</Menu.Label>
              <Menu.Divider />
              {alertTypes.map((type) => {
                const ItemIcon = type.icon;

                return (
                  <Menu.Item
                    key={type.value}
                    leftSection={
                      <ItemIcon
                        className={"alert-icon"}
                        data-alert-icon-type={type.value}
                      />
                    }
                    onClick={() =>
                      props.editor.updateBlock(props.block, {
                        type: "alert",
                        props: { type: type.value },
                      })
                    }
                  >
                    {type.title}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
          {/*Rich text field for user to type in*/}
          <div className={"inline-content"} ref={props.contentRef} />
        </div>
      );
    },
    // The alert's box, around the title row and the body.
    renderFrame: (props) => (
      <div className={"alert-frame"} data-alert-type={props.block.props.type}>
        <div ref={props.slotRef} />
      </div>
    ),
  },
);
