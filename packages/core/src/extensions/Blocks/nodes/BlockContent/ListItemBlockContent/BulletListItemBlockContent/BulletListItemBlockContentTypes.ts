import { Block, BlockPropsType } from "../../BlockContentTypes";

export type BulletListItemBlockSettableProps = {};

export type BulletListItemBlockAllProps = {};

export type BulletListItemBlock<PropsType extends BlockPropsType> = Block<
  "bulletListItem",
  PropsType,
  BulletListItemBlockSettableProps,
  BulletListItemBlockAllProps
>;
