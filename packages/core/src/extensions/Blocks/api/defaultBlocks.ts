import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { createBlockFromTiptapNode } from "./block";
import { BlockFromBlockSpec, defaultBlockProps } from "./blockTypes";

// this file defines the default blocks that are available in the editor
// and their types (Block types)

export const NumberedListItemBlock = createBlockFromTiptapNode(
  "numberedListItem",
  {
    props: defaultBlockProps,
  },
  NumberedListItemBlockContent
);

export type NumberedListItemBlockType = BlockFromBlockSpec<
  typeof NumberedListItemBlock
>;

export const BulletListItemBlock = createBlockFromTiptapNode(
  "bulletListItem",
  {
    props: defaultBlockProps,
  },
  BulletListItemBlockContent
);

export type BulletListItemBlockType = BlockFromBlockSpec<
  typeof BulletListItemBlock
>;

export const HeadingBlock = createBlockFromTiptapNode(
  "heading",
  {
    props: [
      ...defaultBlockProps,
      {
        name: "level",
        values: ["1", "2", "3"],
        default: "1",
      },
    ] as const,
  },
  HeadingBlockContent
);

export type HeadingBlockType = BlockFromBlockSpec<typeof HeadingBlock>;

export const ParagraphBlock = createBlockFromTiptapNode(
  "paragraph",
  {
    props: defaultBlockProps,
  },
  ParagraphBlockContent
);

export type ParagraphBlockType = BlockFromBlockSpec<typeof ParagraphBlock>;

export const defaultBlocks = [
  ParagraphBlock,
  NumberedListItemBlock,
  BulletListItemBlock,
  HeadingBlock,
];
export type DefaultBlockTypes =
  | NumberedListItemBlockType
  | BulletListItemBlockType
  | HeadingBlockType
  | ParagraphBlockType;
