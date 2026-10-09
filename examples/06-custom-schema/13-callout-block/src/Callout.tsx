import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

// The Callout block: a titled block. `content: "inline"` gives the block its
// own rich-text title, and its child blocks sit inside the callout. The
// `experimental_keyboard` settings keep them inside: Enter in the title adds a first child
// block, child blocks can't be outdented out, and Enter in an empty last child
// block leaves the callout. `render` draws the title row (the title mounts
// into `contentRef`), while `renderFrame` draws the box around the title and
// the child blocks together.
export const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {},
    content: "inline",
  },
  {
    experimental_keyboard: {
      enter: "into-children",
      childrenCanOutdent: false,
      emptyChildEnter: "exit-at-end",
    },
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
