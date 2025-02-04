import { Parent as HASTParent } from "hast";
/**
 * Rehype plugin which removes <u> tags. Used to remove underlines before converting HTML to markdown, as Markdown
 * doesn't support underlines.
 */
export declare function removeUnderlines(): (tree: HASTParent) => void;
