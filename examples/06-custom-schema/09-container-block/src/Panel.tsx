import { createReactBlockSpec } from "@blocknote/react";
import { MdCheckCircle, MdInfo, MdLightbulb, MdWarning } from "react-icons/md";

import "./styles.css";

// The flavors of panel the user can switch between.
export const panelFlavors = [
  { value: "tip", title: "Tip", icon: MdLightbulb },
  { value: "info", title: "Info", icon: MdInfo },
  { value: "warning", title: "Warning", icon: MdWarning },
  { value: "success", title: "Success", icon: MdCheckCircle },
] as const;

// The Panel block. Declared with `content: "none"` plus the `children`
// config: the block hosts arbitrary child blocks in its body, exposed at
// runtime as `block.children`.
//
// A pure container draws its box in `render`: the children mount
// straight into its editable region. The frame renders live inside the React
// node view, so prop changes (like the flavor below) re-render the box in
// place without rebuilding the children.
export const createPanel = createReactBlockSpec(
  {
    type: "panel",
    propSchema: {
      flavor: {
        default: "tip",
        values: ["tip", "info", "warning", "success"],
      },
    },
    content: "none",
    // `children: { allow: "blocks" }` is the entire container declaration: any
    // block is allowed, at least one is required, and BlockNote fills the
    // panel with an empty paragraph when it's created. `min` tunes this.
    children: { allow: "blocks" },
  },
  {
    render: (props) => {
      const flavor =
        panelFlavors.find((f) => f.value === props.block.props.flavor) ??
        panelFlavors[0];
      const Icon = flavor.icon;

      const cycleFlavor = () => {
        const idx = panelFlavors.findIndex(
          (f) => f.value === props.block.props.flavor,
        );
        const next = panelFlavors[(idx + 1) % panelFlavors.length];
        props.editor.updateBlock(props.block, {
          type: "panel",
          props: { flavor: next.value },
        });
      };

      return (
        <div className={"panel"} data-flavor={props.block.props.flavor}>
          <button
            className={"panel-icon-button"}
            type={"button"}
            contentEditable={false}
            onClick={cycleFlavor}
            aria-label={`Cycle panel flavor (current: ${flavor.title})`}
            title={`Click to cycle flavor (current: ${flavor.title})`}
          >
            <Icon size={20} />
          </button>
          <div className={"panel-body"} ref={props.contentRef} />
        </div>
      );
    },
  },
);
