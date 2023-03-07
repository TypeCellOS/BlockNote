/** Define the main block types **/

import { InlineContent, PartialInlineContent } from "./inlineContentTypes";

export type BlockTemplate<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Changeable props which affect the block's behaviour or appearance.
  // An example might be: { textAlignment: "left" | "right" | "center" } for a paragraph block.
  Props extends Record<string, string>
> = {
  id: string;
  type: Type;
  props: Props;
  content: InlineContent[];
  children: Block[];
};

export type GlobalProps = {
  backgroundColor: string;
  textColor: string;
  textAlignment: "left" | "center" | "right" | "justify";
};

export type NumberedListItemBlock = BlockTemplate<
  "numberedListItem",
  GlobalProps
>;

export type BulletListItemBlock = BlockTemplate<"bulletListItem", GlobalProps>;

export type HeadingBlock = BlockTemplate<
  "heading",
  GlobalProps & {
    level: "1" | "2" | "3";
  }
>;

export type ParagraphBlock = BlockTemplate<"paragraph", GlobalProps>;

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | BulletListItemBlock
  | NumberedListItemBlock;

/** Define "Partial Blocks", these are for updating or creating blocks */
export type PartialBlockTemplate<B extends Block> = B extends Block
  ? Partial<Omit<B, "props" | "children" | "content" | "type">> & {
      type?: B["type"];
      props?: Partial<B["props"]>;
      content?: string | PartialInlineContent[];
      children?: PartialBlock[];
    }
  : never;

export type PartialBlock = PartialBlockTemplate<Block>;

export type BlockPropsTemplate<Props> = Props extends Block["props"]
  ? keyof Props
  : never;

/**
 * Expose blockProps. This is currently not very nice, but it's expected this
 * will change anyway once we allow for custom blocks
 */

export const globalProps: Array<keyof GlobalProps> = [
  "backgroundColor",
  "textColor",
  "textAlignment",
];

export const blockProps: Record<Block["type"], Set<string>> = {
  paragraph: new Set<keyof ParagraphBlock["props"]>([...globalProps]),
  heading: new Set<keyof HeadingBlock["props"]>([
    ...globalProps,
    "level" as const,
  ]),
  numberedListItem: new Set<keyof NumberedListItemBlock["props"]>([
    ...globalProps,
  ]),
  bulletListItem: new Set<keyof BulletListItemBlock["props"]>([...globalProps]),
};
