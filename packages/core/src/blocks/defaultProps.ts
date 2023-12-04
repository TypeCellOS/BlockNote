import type { Props, PropSchema } from "../schema";

// TODO: this system should probably be moved / refactored.
// The dependency from schema on this file doesn't make sense

export const defaultProps = {
  backgroundColor: {
    default: "default" as const,
  },
  textColor: {
    default: "default" as const,
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
} satisfies PropSchema;

export type DefaultProps = Props<typeof defaultProps>;

// Default props which are set on `blockContainer` nodes rather than
// `blockContent` nodes. Ensures that they are not redundantly added to
// a custom block's TipTap node attributes.
export const inheritedProps = ["backgroundColor", "textColor"];
