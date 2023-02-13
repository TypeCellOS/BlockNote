import { StyledText } from "./styleTypes";

export type BlockSpec<
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
  textContent: string;
  styledTextContent: StyledText[];
  children: Block[];
};

export type BlockSpecUpdate<Spec> = Spec extends BlockSpec<
  infer Type,
  infer Props
>
  ? {
      type: Type;
      props?: Partial<Props>;
      styledTextContent?: StyledText[];
    }
  : never;

export type NumberedListItemBlock = BlockSpec<"numberedListItem", {}>;

export type BulletListItemBlock = BlockSpec<"bulletListItem", {}>;

export type HeadingBlock = BlockSpec<
  "heading",
  {
    level: "1" | "2" | "3";
  }
>;

export type ParagraphBlock = BlockSpec<"paragraph", {}>;

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | BulletListItemBlock
  | NumberedListItemBlock;

export type BlockUpdate = BlockSpecUpdate<Block>;

// TODO:
//  1) guard read / writes (now we just pass on internal node attrs)
//  2) where to locate this code / types
