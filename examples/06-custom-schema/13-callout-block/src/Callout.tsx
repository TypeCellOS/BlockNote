import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

// The Callout block: a titled block. `content: "inline"` plus `children`
// gives the block its own rich-text title with child blocks as its body.
// `render` draws the title row (the title mounts into `contentRef`), while
// `renderFrame` draws the box around the title and the body together.
export const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {},
    content: "inline",
    // The title is ordinary inline content; the children are the body.
    children: { allow: "blocks" },
  },
  {
    render: (props) => (
      <div className={"callout-title-row"}>
        <span className={"callout-badge"} contentEditable={false}>
          !
        </span>
        <span className={"callout-title"} ref={props.contentRef} />
      </div>
    ),
    renderFrame: (props) => (
      <div className={"callout"}>
        <div className={"callout-slot"} ref={props.contentRef} />
      </div>
    ),
  },
);
