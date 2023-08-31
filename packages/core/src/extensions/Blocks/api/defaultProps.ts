import { PropSchema } from "./blockTypes";

export const defaultProps = {
  backgroundColor: {
    default: "transparent" as const,
  },
  textColor: {
    default: "black" as const, // TODO
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
} satisfies PropSchema;

export type DefaultProps = typeof defaultProps;
