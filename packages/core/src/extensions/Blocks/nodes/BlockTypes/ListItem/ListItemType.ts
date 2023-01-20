import { BlockContent } from "../BlockContentType";

export type ListItem = BlockContent<"listItem", { ordered: "true" | "false" }>;
