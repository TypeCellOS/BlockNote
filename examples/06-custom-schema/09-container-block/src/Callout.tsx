import { createReactBlockSpec } from "@blocknote/react";
import { MdCheckCircle, MdInfo, MdLightbulb, MdWarning } from "react-icons/md";

import "./styles.css";

// The flavors of callout the user can switch between.
export const calloutTypes = [
  { value: "tip", title: "Tip", icon: MdLightbulb },
  { value: "info", title: "Info", icon: MdInfo },
  { value: "warning", title: "Warning", icon: MdWarning },
  { value: "success", title: "Success", icon: MdCheckCircle },
] as const;

// The Callout block. Declared with `content: "none"` plus the `children`
// config: the block hosts arbitrary child blocks in its body, exposed at
// runtime as `block.children`.
//
// The callout's title shows a related pattern: content that shouldn't be
// part of the rich-text document (no formatting, comments, or multiplayer
// cursors needed) can live in a plain string prop, edited through a regular
// <input> rendered inside the block.
export const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      flavor: {
        default: "tip",
        values: ["tip", "info", "warning", "success"],
      },
      title: {
        default: "",
      },
    },
    content: "none",
    // `children: { allow: "any" }` is the entire container declaration: any
    // block is allowed, at least one is required, and BlockNote fills the
    // callout with an empty paragraph when it's created. `min` / `max` /
    // `default` / `whenEmptied` / `boundary` tune this.
    children: { allow: "any" },
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

      const commitTitle = (title: string) => {
        if (title !== props.block.props.title) {
          props.editor.updateBlock(props.block, {
            type: "callout",
            props: { title },
          });
        }
      };

      return (
        <div className={"callout"}>
          <button
            className={"callout-icon-button"}
            type={"button"}
            contentEditable={false}
            onClick={cycleFlavor}
            aria-label={`Cycle callout flavor (current: ${flavor.title})`}
            title={`Click to cycle flavor (current: ${flavor.title})`}
          >
            <Icon size={20} />
          </button>
          <div className={"callout-main"}>
            {/* The title lives in a string prop, not in document content,
                and is edited via a plain input. `contentEditable={false}`
                keeps ProseMirror from treating typing here as document
                input. */}
            <div className={"callout-title-wrapper"} contentEditable={false}>
              <input
                className={"callout-title-input"}
                placeholder={"Add title"}
                defaultValue={props.block.props.title}
                onBlur={(event) => commitTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className={"callout-body"} ref={props.contentRef} />
          </div>
        </div>
      );
    },
  },
);
