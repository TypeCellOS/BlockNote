import { HeadingBlockContent } from "../nodes/BlockContent/HeadingBlockContent/HeadingBlockContent";
import { BulletListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent";
import { NumberedListItemBlockContent } from "../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent";
import { ParagraphBlockContent } from "../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent";
import { createBlockSpec } from "./block";
import { TypesMatch } from "./blockTypes";

export const defaultProps = {
  backgroundColor: {
    default: "transparent" as const,
  },
  textColor: {
    default: "black" as const, // TODO
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
} as const; // TODO: upgrade typescript and use satisfies PropSpec

export const defaultBlockSchema = {
  paragraph: {
    propSchema: defaultProps,
    node: ParagraphBlockContent,
  },
  heading: {
    propSchema: {
      ...defaultProps,
      level: { default: "1", values: ["1", "2", "3"] as const },
    },
    node: HeadingBlockContent,
  },
  bulletListItem: {
    propSchema: defaultProps,
    node: BulletListItemBlockContent,
  },
  numberedListItem: {
    propSchema: defaultProps,
    node: NumberedListItemBlockContent,
  },
} as const;

const imageProps = { src: { default: "gfr" } } as const;
export const onlyImageBlockSchema = {
  image: createBlockSpec({
    type: "image",
    propSchema: imageProps,
    containsInlineContent: false,
    render: (block) => {
      const img = document.createElement("img");
      img.setAttribute("src", block().props.src);
      return { dom: img };
    },
  }),
} as const;

export type DefaultBlockSchema = TypesMatch<typeof defaultBlockSchema>;

// export type DefaultBlocks = Block<DefaultBlockSpecs>;
