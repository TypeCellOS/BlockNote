import { Block, BlockPropsType } from "../../BlockContentTypes";

export type NumberedListItemBlockSettableProps = {};

export type NumberedListItemBlockAllProps = {
  index: `${number}`;
};

export type NumberedListItemBlock<PropsType extends BlockPropsType> = Block<
  "numberedListItem",
  PropsType,
  NumberedListItemBlockSettableProps,
  NumberedListItemBlockAllProps
>;
