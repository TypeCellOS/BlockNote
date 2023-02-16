import { StyledText } from "./styleTypes";

export type BlockTemplate<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Changeable props which affect the block's behaviour or appearance.
  // An example might be: { textAlignment: "left" | "right" | "center" } for a paragraph block.
  Props extends Record<string, string>
> = {
  id: string | null;
  type: Type;
  props: Props;
  textContent: string;
  styledTextContent: StyledText[];
  children: Block[];
};

export type BlockSpecTemplate<Spec> = Spec extends BlockTemplate<
  infer Type,
  infer Props
>
  ? {
      type: Type;
      props?: Partial<Props>;
      content?: string | StyledText[];
      children?: Block[];
    }
  : never;

export type NumberedListItemBlock = BlockTemplate<"numberedListItem", {}>;

export type BulletListItemBlock = BlockTemplate<"bulletListItem", {}>;

export type HeadingBlock = BlockTemplate<
  "heading",
  {
    level: "1" | "2" | "3";
  }
>;

export type ParagraphBlock = BlockTemplate<"paragraph", {}>;

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | BulletListItemBlock
  | NumberedListItemBlock;

export type BlockSpec = BlockSpecTemplate<Block>;

// TODO:
//  1) guard read / writes (now we just pass on internal node attrs)
//  2) where to locate this code / types
