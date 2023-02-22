import { StyledText } from "./styleTypes";

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
      children?: BlockSpec[];
    }
  : never;

export type BlockPropsTemplate<Props> = Props extends Block["props"]
  ? keyof Props
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

// @ts-ignore
export type BlockSpec = BlockSpecTemplate<Block>;

export type BlockProps = BlockPropsTemplate<BlockSpec["props"]>;

// TODO: Better way of doing this type guard?
export const blockProps: Record<Block["type"], Set<BlockProps>> = {
  paragraph: new Set<keyof ParagraphBlock["props"]>(),
  heading: new Set<keyof HeadingBlock["props"]>(["level"]),
  numberedListItem: new Set<keyof NumberedListItemBlock["props"]>(),
  bulletListItem: new Set<keyof BulletListItemBlock["props"]>(),
};
