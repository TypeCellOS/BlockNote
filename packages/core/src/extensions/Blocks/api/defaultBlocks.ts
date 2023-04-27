import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { BlockSpecWithNode, defaultBlockProps } from "./blockTypes";
import { createBlockFromTiptapNode } from "./block";

export const paragraphBlockProps = defaultBlockProps;

export type ParagraphBlockSpec = BlockSpecWithNode<
  "paragraph",
  typeof paragraphBlockProps
>;

export const paragraphBlockSpec: ParagraphBlockSpec = {
  propSpecs: paragraphBlockProps,
  node: ParagraphBlockContent,
} as const;

const headingBlockProps = {
  ...defaultBlockProps,
  level: { default: "1" as const, values: ["1", "2", "3"] as const },
};

export type HeadingBlockSpec = BlockSpecWithNode<
  "heading",
  typeof headingBlockProps
>;

export const headingBlockSpec: HeadingBlockSpec = {
  propSpecs: headingBlockProps,
  node: HeadingBlockContent,
};

export const bulletListItemBlockProps = defaultBlockProps;

export type BulletListItemBlockSpec = BlockSpecWithNode<
  "bulletListItem",
  typeof bulletListItemBlockProps
>;

export const bulletListItemBlockSpec: BulletListItemBlockSpec = {
  propSpecs: bulletListItemBlockProps,
  node: BulletListItemBlockContent,
};

export const numberedListItemBlockProps = defaultBlockProps;

export type NumberedListItemBlockSpec = BlockSpecWithNode<
  "numberedListItem",
  typeof numberedListItemBlockProps
>;

export const numberedListItemBlockSpec: NumberedListItemBlockSpec = {
  propSpecs: numberedListItemBlockProps,
  node: NumberedListItemBlockContent,
};

export const defaultBlockSpecs = {
  [paragraphBlockSpec.node.name]: createBlockFromTiptapNode(paragraphBlockSpec),
  [headingBlockSpec.node.name]: createBlockFromTiptapNode(headingBlockSpec),
  [bulletListItemBlockSpec.node.name]: createBlockFromTiptapNode(
    bulletListItemBlockSpec
  ),
  [numberedListItemBlockSpec.node.name]: createBlockFromTiptapNode(
    numberedListItemBlockSpec
  ),
} as const;

export type DefaultBlockSpecs = typeof defaultBlockSpecs;

// export type DefaultBlocks = Block<DefaultBlockSpecs>;
