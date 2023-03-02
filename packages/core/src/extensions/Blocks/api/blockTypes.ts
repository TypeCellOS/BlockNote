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
  content: StyledText[];
  children: Block[];
};

export type PartialBlockTemplate<Template> = Template extends BlockTemplate<
  infer Type,
  infer Props
>
  ? {
      id?: string;
      type: Type;
      props?: Partial<Props>;
      content?: string | StyledText[];
      children?: PartialBlock[];
    }
  : never;

export type BlockPropsTemplate<Props> = Props extends Block["props"]
  ? keyof Props
  : never;

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

// @ts-ignore
export type PartialBlock = PartialBlockTemplate<Block>;

export type BlockProps = BlockPropsTemplate<PartialBlock["props"]>;

// TODO: Better way of doing this type guard?
export const globalProps: Array<keyof GlobalProps> = [
  "backgroundColor",
  "textColor",
  "textAlignment",
];
export const blockProps: Record<Block["type"], Set<BlockProps>> = {
  paragraph: new Set<keyof ParagraphBlock["props"]>([...globalProps]),
  heading: new Set<keyof HeadingBlock["props"]>([...globalProps, "level"]),
  numberedListItem: new Set<keyof NumberedListItemBlock["props"]>([
    ...globalProps,
  ]),
  bulletListItem: new Set<keyof BulletListItemBlock["props"]>([...globalProps]),
};
