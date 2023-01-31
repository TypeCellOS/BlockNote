export type BlockSpec<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Changeable props which affect the block's behaviour or appearance.
  // An example might be: { textAlignment: "left" | "right" | "center" | "justify" } for a paragraph block.
  Props extends Record<string, string>
> = {
  type: Type;
  props: Props;
};

export type BlockSpecUpdate<Spec> = Spec extends BlockSpec<
  infer Type,
  infer Props
>
  ? {
      type: Type;
      props?: Partial<Props>;
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

/*
TODO:
 1) guard read / writes (now we just pass on internal node attrs)
 2) where to locate this code / types
*/
