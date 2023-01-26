import { Block, BlockPropsType } from "../BlockContentTypes";

export type ParagraphBlockSettableProps = {};

export type ParagraphBlockAllProps = {};

export type ParagraphBlock<PropsType extends BlockPropsType> = Block<
  "paragraph",
  PropsType,
  ParagraphBlockSettableProps,
  ParagraphBlockAllProps
>;
