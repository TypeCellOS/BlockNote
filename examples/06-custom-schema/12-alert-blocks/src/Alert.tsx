import { createBlockSpec } from "@blocknote/core";

import "./styles.css";

const alertFlavors = ["info", "warning", "success"] as const;

// Alert WITH a title: a titled block. The title is the block's own inline
// content, and the body is its `children` - other blocks that belong to it.
// `render` draws the title row (the title mounts into `contentDOM`), while
// `renderFrame` draws the box around the title and the body together: both
// render into the frame's `slot`.
//
// Flavor-dependent styling lives in `renderFrame`, not `render`: the frame
// rebuilds whenever the block's props change, so reading
// `block.props.flavor` there is always fresh.
export const createAlert = createBlockSpec(
  {
    type: "alert" as const,
    propSchema: {
      flavor: {
        default: "info",
        values: [...alertFlavors],
      },
    },
    content: "inline",
    children: { allow: "blocks" },
  },
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "alert-title-row";
      const badge = document.createElement("span");
      badge.className = "alert-badge";
      badge.textContent = "!";
      badge.contentEditable = "false";
      const contentDOM = document.createElement("span");
      contentDOM.className = "alert-title";
      dom.append(badge, contentDOM);
      return { dom, contentDOM };
    },
    renderFrame: (block) => {
      const dom = document.createElement("div");
      dom.className = "alert";
      dom.dataset.flavor = block.props.flavor;
      const slot = document.createElement("div");
      slot.className = "alert-slot";
      dom.append(slot);
      return {
        dom,
        slot,
        update: (newBlock) => {
          dom.dataset.flavor = newBlock.props.flavor;
        },
      };
    },
  },
);

// Alert WITHOUT a title: a pure container. There is no content of its own,
// only a body of child blocks, so `render` draws the box and the
// children mount straight into it (`contentDOM: dom`).
export const createAlertBox = createBlockSpec(
  {
    type: "alertBox" as const,
    propSchema: {
      flavor: {
        default: "info",
        values: [...alertFlavors],
      },
    },
    content: "none",
    children: { allow: "blocks" },
  },
  {
    render: (block) => {
      const dom = document.createElement("div");
      dom.className = "alert";
      dom.dataset.flavor = block.props.flavor;
      return {
        dom,
        contentDOM: dom,
        update: (newBlock) => {
          dom.dataset.flavor = newBlock.attrs.flavor;
        },
      };
    },
  },
);
