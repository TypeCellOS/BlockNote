import { c, combinatorContentType } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { Menu } from "@mantine/core";
import {
  MdInfoOutline,
  MdLightbulbOutline,
  MdOutlineCheckCircle,
  MdWarningAmber,
} from "react-icons/md";

import "./styles.css";

// The callout's content is a stretch of full editor blocks — paragraphs,
// headings, lists, even nested callouts. The block's JSON `content` is
// automatically `Block[]` (the same shape used everywhere else in BlockNote
// for a sequence of blocks).
const calloutContentType = combinatorContentType("callout", c.blocks());

export const calloutTones = [
  { value: "info", title: "Info", icon: MdInfoOutline },
  { value: "tip", title: "Tip", icon: MdLightbulbOutline },
  { value: "success", title: "Success", icon: MdOutlineCheckCircle },
  { value: "warning", title: "Warning", icon: MdWarningAmber },
] as const;

export const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      tone: {
        default: "info",
        values: ["info", "tip", "success", "warning"] as const,
      },
    },
    content: calloutContentType,
  },
  {
    render: (props) => {
      const tone =
        calloutTones.find((t) => t.value === props.block.props.tone) ??
        calloutTones[0];
      const Icon = tone.icon;
      return (
        <div className="callout" data-callout-tone={props.block.props.tone}>
          {/* Icon — non-editable; opens a menu to change the tone. */}
          <Menu withinPortal={false}>
            <Menu.Target>
              <div className="callout-icon-wrapper" contentEditable={false}>
                <Icon
                  className="callout-icon"
                  data-callout-icon-tone={props.block.props.tone}
                  size={24}
                />
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Callout tone</Menu.Label>
              <Menu.Divider />
              {calloutTones.map((t) => {
                const ItemIcon = t.icon;
                return (
                  <Menu.Item
                    key={t.value}
                    leftSection={
                      <ItemIcon
                        className="callout-icon"
                        data-callout-icon-tone={t.value}
                      />
                    }
                    onClick={() =>
                      props.editor.updateBlock(props.block, {
                        type: "callout",
                        props: { tone: t.value },
                      })
                    }
                  >
                    {t.title}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
          {/*
            Content body: the parent's contentDOM. ProseMirror mounts each
            child block as a `blockContainer` here, just like in the top-level
            document. All editor commands (slash menu, drag handle, copy/paste,
            block manipulation APIs) work inside this slot.
          */}
          <div className="callout-body" ref={props.contentRef} />
        </div>
      );
    },
  },
);
