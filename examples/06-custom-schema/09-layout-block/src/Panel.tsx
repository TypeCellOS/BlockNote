import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

export const createPanel = createReactBlockSpec(
  {
    type: "panel",
    propSchema: {},
    content: "none",
    layoutOnly: true,
  },
  {
    // With no content of its own, the panel draws only its frame. The slot
    // (`slotRef`) receives its child blocks.
    renderFrame: (props) => <div className="panel" ref={props.slotRef} />,
  },
);
