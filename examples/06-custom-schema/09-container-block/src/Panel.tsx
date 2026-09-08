import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

export const createPanel = createReactBlockSpec(
  {
    type: "panel",
    propSchema: {},
    content: "none",
    children: { allow: "blocks" },
  },
  {
    // With no content of its own, contentRef receives the child blocks.
    render: (props) => <div className="panel" ref={props.contentRef} />,
  },
);
