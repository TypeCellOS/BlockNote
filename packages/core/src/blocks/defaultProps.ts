import * as z from "zod/v4";
// TODO: this system should probably be moved / refactored.
// The dependency from schema on this file doesn't make sense

export const defaultProps = z.object({
  backgroundColor: z.string().default("default"),
  textColor: z.string().default("default"),
  textAlignment: z.enum(["left", "center", "right", "justify"]).default("left"),
});

export type DefaultProps = z.infer<typeof defaultProps>;

// Default props which are set on `blockContainer` nodes rather than
// `blockContent` nodes. Ensures that they are not redundantly added to
// a custom block's TipTap node attributes.
export const inheritedProps = ["backgroundColor", "textColor"];
