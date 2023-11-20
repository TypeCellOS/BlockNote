import {
  Block,
  BlockSchema,
  PartialBlock,
  TableContent,
} from "../../extensions/Blocks/api/blockTypes";
import {
  InlineContent,
  PartialInlineContent,
  StyledText,
} from "../../extensions/Blocks/api/inlineContentTypes";
import { StyleSchema } from "../../extensions/Blocks/api/styles";

function textShorthandToStyledText(
  content: string | StyledText<any>[] = ""
): StyledText<any>[] {
  if (typeof content === "string") {
    return [
      {
        type: "text",
        text: content,
        styles: {},
      },
    ];
  }
  return content;
}

function partialContentToInlineContent(
  content: string | PartialInlineContent<any>[] | TableContent<any> = ""
): InlineContent<any>[] | TableContent<any> {
  if (typeof content === "string") {
    return textShorthandToStyledText(content);
  }

  if (Array.isArray(content)) {
    return content.map((partialContent) => {
      if (partialContent.type === "link") {
        return {
          ...partialContent,
          content: textShorthandToStyledText(partialContent.content),
        };
      } else {
        return partialContent;
      }
    });
  }

  return content;
}

export function partialBlockToBlockForTesting<
  BSchema extends BlockSchema,
  S extends StyleSchema
>(partialBlock: PartialBlock<BSchema, S>): Block<BSchema, S> {
  const withDefaults: Block<BSchema, S> = {
    id: "",
    type: "paragraph",
    // because at this point we don't have an easy way to access default props at runtime,
    // partialBlockToBlockForTesting will not set them.
    props: {} as any,
    content: [] as any,
    children: [] as any,
    ...partialBlock,
  };

  return {
    ...withDefaults,
    content: partialContentToInlineContent(withDefaults.content),
    children: withDefaults.children.map((c) => {
      return partialBlockToBlockForTesting(c);
    }),
  } as any;
}
