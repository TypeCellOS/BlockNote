import { Parent as HASTParent } from "hast";
/**
 * Rehype plugin which adds a space after each checkbox input element. This is
 * because remark doesn't add any spaces between the checkbox input and the text
 * itself, but these are needed for correct Markdown syntax.
 */
export declare function addSpacesToCheckboxes(): (tree: HASTParent) => void;
