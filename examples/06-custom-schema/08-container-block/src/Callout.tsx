import { createReactBlockSpec, NodeViewWrapper } from "@blocknote/react";
import {
  MdCheckCircle,
  MdInfo,
  MdLightbulb,
  MdWarning,
} from "react-icons/md";

import "./styles.css";

// The flavors of callout the user can switch between.
export const calloutTypes = [
  { value: "tip", title: "Tip", icon: MdLightbulb },
  { value: "info", title: "Info", icon: MdInfo },
  { value: "warning", title: "Warning", icon: MdWarning },
  { value: "success", title: "Success", icon: MdCheckCircle },
] as const;

// The Callout block. Declared with `content: "none"` plus the new `container`
// config — the block hosts arbitrary child blocks in its body, exposed at
// runtime as `block.children`.
export const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      flavor: {
        default: "tip",
        values: ["tip", "info", "warning", "success"],
      },
    },
    content: "none",
    container: {
      min: 1,
      defaultBlocks: ["paragraph"],
    },
  },
  {
    render: (props) => {
      const flavor =
        calloutTypes.find((c) => c.value === props.block.props.flavor) ??
        calloutTypes[0];
      const Icon = flavor.icon;

      const cycleFlavor = () => {
        const idx = calloutTypes.findIndex(
          (c) => c.value === props.block.props.flavor,
        );
        const next = calloutTypes[(idx + 1) % calloutTypes.length];
        props.editor.updateBlock(props.block, {
          type: "callout",
          props: { flavor: next.value },
        });
      };

      return (
        <NodeViewWrapper
          className={"callout"}
          data-node-type="callout"
          data-id={props.block.id}
          data-flavor={flavor.value}
        >
          <button
            className={"callout-icon-button"}
            type={"button"}
            contentEditable={false}
            onClick={cycleFlavor}
            title={`Click to cycle flavor (current: ${flavor.title})`}
          >
            <Icon size={20} />
          </button>
          <div className={"callout-body"} ref={props.contentRef} />
        </NodeViewWrapper>
      );
    },
  },
);
