import {
  Block,
  BlockSchema,
  PartialBlock,
  TableContent,
} from "../../extensions/Blocks/api/blocks/types";
import {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
  StyledText,
  isPartialLinkInlineContent,
} from "../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../extensions/Blocks/api/styles/types";

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
  content: PartialInlineContent<any, any> | TableContent<any> | undefined
): InlineContent<any, any>[] | TableContent<any> | undefined {
  if (typeof content === "string") {
    return textShorthandToStyledText(content);
  }

  if (Array.isArray(content)) {
    return content.flatMap((partialContent) => {
      if (typeof partialContent === "string") {
        return textShorthandToStyledText(partialContent);
      } else if (isPartialLinkInlineContent(partialContent)) {
        return {
          ...partialContent,
          content: textShorthandToStyledText(partialContent.content),
        };
      } else {
        // TODO?
        return partialContent;
      }
    });
  }

  return content;
}

export function partialBlockToBlockForTesting<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BSchema,
  partialBlock: PartialBlock<BSchema, I, S>
): Block<BSchema, I, S> {
  const withDefaults: Block<BSchema, I, S> = {
    id: "",
    type: partialBlock.type!,
    props: {} as any,
    content:
      schema[partialBlock.type!].content === "inline" ? [] : (undefined as any),
    children: [] as any,
    ...partialBlock,
  };

  Object.entries(schema[partialBlock.type!].propSchema).forEach(
    ([propKey, propValue]) => {
      if (withDefaults.props[propKey] === undefined) {
        (withDefaults.props as any)[propKey] = propValue.default;
      }
    }
  );

  return {
    ...withDefaults,
    content: partialContentToInlineContent(withDefaults.content),
    children: withDefaults.children.map((c) => {
      return partialBlockToBlockForTesting(schema, c);
    }),
  } as any;
}
