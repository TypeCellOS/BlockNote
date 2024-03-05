import UniqueID from "../../extensions/UniqueID/UniqueID";
import {
  Block,
  BlockSchema,
  PartialBlock,
  TableContent,
} from "../../schema/blocks/types";
import {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
  StyledText,
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types";
import { StyleSchema } from "../../schema/styles/types";

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
      } else if (isStyledTextInlineContent(partialContent)) {
        return partialContent;
      } else {
        // custom inline content

        return {
          props: {},
          ...partialContent,
          content: partialContentToInlineContent(partialContent.content),
        } as any;
      }
    });
  }

  return content;
}

export function partialBlocksToBlocksForTesting<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BSchema,
  partialBlocks: Array<PartialBlock<BSchema, I, S>>
): Array<Block<BSchema, I, S>> {
  return partialBlocks.map((partialBlock) =>
    partialBlockToBlockForTesting(schema, partialBlock)
  );
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

export function addIdsToBlock(block: PartialBlock<any, any, any>) {
  if (!block.id) {
    block.id = UniqueID.options.generateID();
  }
  if (block.children) {
    addIdsToBlocks(block.children);
  }
}

export function addIdsToBlocks(blocks: PartialBlock<any, any, any>[]) {
  for (const block of blocks) {
    addIdsToBlock(block);
  }
}
