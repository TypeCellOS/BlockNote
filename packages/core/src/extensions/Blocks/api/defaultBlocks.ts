import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { Block, BlockSpecWithNode, defaultBlockProps } from "./blockTypes";

export const paragraphBlockProps = defaultBlockProps;

export type ParagraphBlockSpec = BlockSpecWithNode<
  "paragraph",
  typeof paragraphBlockProps
>;

export const paragraphBlockSpec: ParagraphBlockSpec = {
  type: "paragraph",
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
  type: "heading",
  propSpecs: headingBlockProps,
  node: HeadingBlockContent,
};

export const bulletListItemBlockProps = defaultBlockProps;

export type BulletListItemBlockSpec = BlockSpecWithNode<
  "bulletListItem",
  typeof bulletListItemBlockProps
>;

export const bulletListItemBlockSpec: BulletListItemBlockSpec = {
  type: "bulletListItem",
  propSpecs: bulletListItemBlockProps,
  node: BulletListItemBlockContent,
};

export const numberedListItemBlockProps = defaultBlockProps;

export type NumberedListItemBlockSpec = BlockSpecWithNode<
  "numberedListItem",
  typeof numberedListItemBlockProps
>;

export const numberedListItemBlockSpec: NumberedListItemBlockSpec = {
  type: "numberedListItem",
  propSpecs: numberedListItemBlockProps,
  node: NumberedListItemBlockContent,
};

export const defaultBlockSpecs = {
  [paragraphBlockSpec.type]: paragraphBlockSpec,
  [headingBlockSpec.type]: headingBlockSpec,
  [bulletListItemBlockSpec.type]: bulletListItemBlockSpec,
  [numberedListItemBlockSpec.type]: numberedListItemBlockSpec,
} as const;

export type DefaultBlockSpecs = typeof defaultBlockSpecs;

export type DefaultBlocks = Block<DefaultBlockSpecs>;
