import remarkStringify from "remark-stringify";
import { unified } from "unified";

export function markdownNodeToString(node: any) {
  const md = unified().use(remarkStringify).stringify(node);
  return md;
}
