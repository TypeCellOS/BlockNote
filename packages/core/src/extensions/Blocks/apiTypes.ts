export type BlockSpec<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Block props that are manually settable.
  // An example might be: { textAlignment: "left" | "right" | "center" | "justify" } for a paragraph block.
  Props extends Record<string, string>
  // PropsWithDefaults extends keyof Props
> = {
  type: Type;
  props: Props;
};

// export type SetBlock<Bl extends Block<A,B,C>, A extends string ,B extends Record<string, string>,C extends keyof B> = number;

// export type SetBlock<Bl> = Bl extends Block<infer A, infer B, infer C>
//   ? Block<A, { a: string, b: string}, "a">
//   : never;

// type SettableBNBlock = SetBlock<Block>;
// function updateBlock(block: SettableBNBlock) {

// }

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

type SetBlockSpec<B> = B extends BlockSpec<infer T, infer P>
  ? {
      type: T;
      props?: Partial<P>;
    }
  : never;

export type SettableBlock = SetBlockSpec<Block>;

/*
1) guard read / writes (now we just pass on internal node attrs)
2) where to locate this code / types
*/
