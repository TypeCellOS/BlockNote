import { BlockContent } from "../BlockContentType";

export type Heading = BlockContent<"heading", { level: "1" | "2" | "3" }>;
