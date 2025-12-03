import { createPropSchemaFromZod } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { z } from "zod/v4";

// The Mention inline content.
export const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: createPropSchemaFromZod(
      z.object({
        user: z.string().default("Unknown"),
      }),
    ),
    content: "none",
  },
  {
    render: (props) => (
      <span style={{ backgroundColor: "#8400ff33" }}>
        @{props.inlineContent.props.user}
      </span>
    ),
  },
);
