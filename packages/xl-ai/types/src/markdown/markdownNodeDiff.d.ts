import type { Content } from "mdast";
export type MarkdownNodeDiffResult = {
    type: "changed" | "unchanged";
    newBlock: Content;
    oldBlock: Content;
} | {
    type: "add";
    newBlock: Content;
} | {
    type: "remove";
    oldBlock: Content;
};
/**
 * Flatten lists
 *
 * TODO: add support for nested lists
 */
export declare function flattenAst(ast: Content[]): Content[];
/**
 * Takes two versions of a markdown document, and
 * returns a list of `DiffResult` objects indicating
 * whether a markdown node has been added, removed, changed, or unchanged
 */
export declare function markdownNodeDiff(oldMarkdown: string, newMarkdown: string): Promise<MarkdownNodeDiffResult[]>;
