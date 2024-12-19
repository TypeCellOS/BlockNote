import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import UniqueID from "../../extensions/UniqueID/UniqueID.js";
import { BlockSchema, TableContent } from "../../schema/blocks/types.js";
import {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
  StyledText,
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types.js";
import { StyleSchema } from "../../schema/styles/types.js";

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
  } else if (content?.type === "tableContent") {
    return {
      type: "tableContent",
      columnWidths: content.columnWidths,
      rows: content.rows.map((row) => ({
        ...row,
        cells: row.cells.map(
          (cell) => partialContentToInlineContent(cell) as any
        ),
      })),
    };
  }

  return content;
}

export function partialBlocksToBlocksForTesting<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: BlockNoteSchema<BSchema, I, S>,
  partialBlocks: Array<PartialBlock<NoInfer<BSchema>, NoInfer<I>, NoInfer<S>>>
): Array<Block<BSchema, I, S>> {
  return partialBlocks.map((partialBlock) =>
    partialBlockToBlockForTesting(schema.blockSchema, partialBlock)
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
  const contentType: "inline" | "table" | "none" =
    schema[partialBlock.type!].content;

  const withDefaults: Block<BSchema, I, S> = {
    id: "",
    type: partialBlock.type!,
    props: {} as any,
    content:
      contentType === "inline"
        ? []
        : contentType === "table"
        ? { type: "tableContent", columnWidths: [], rows: [] }
        : (undefined as any),
    children: [] as any,
    ...partialBlock,
  };

  Object.entries(schema[partialBlock.type!].propSchema).forEach(
    ([propKey, propValue]) => {
      if (
        withDefaults.props[propKey] === undefined &&
        propValue.default !== undefined
      ) {
        (withDefaults.props as any)[propKey] = propValue.default;
      }
    }
  );

  if (contentType === "inline") {
    const content = withDefaults.content as InlineContent<I, S>[] | undefined;
    withDefaults.content = partialContentToInlineContent(content) as any;
  } else if (contentType === "table") {
    const content = withDefaults.content as TableContent<I, S> | undefined;
    withDefaults.content = {
      type: "tableContent",
      columnWidths:
        content?.columnWidths ||
        content?.rows[0]?.cells.map(() => undefined) ||
        [],
      rows:
        content?.rows.map((row) => ({
          cells: row.cells.map((cell) => partialContentToInlineContent(cell)),
        })) || [],
    } as any;
  }

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
