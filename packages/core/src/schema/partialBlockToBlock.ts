import * as z from "zod/v4/core";
import type { Block, PartialBlock } from "../blocks/index.js";
import { UniqueID } from "../extensions/UniqueID/UniqueID.js";
import { mapTableCell } from "../util/table.js";
import { UnreachableCaseError } from "../util/typescript.js";
import type { BlockSchema } from "./blocks/types.js";
import type {
  PartialTableContent,
  TableCell,
  TableContent,
} from "./blocks/types/tableContent.js";
import type { CustomBlockNoteSchema } from "./CustomBlockNoteSchema.js";
import type {
  InlineContent,
  InlineContentSchema,
  Link,
  PartialInlineContent,
  PartialLink,
  StyledText,
} from "./inlineContent/types.js";
import {
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "./inlineContent/types.js";
import type { Props, PropSchema } from "./propTypes.js";
import type { StyleSchema } from "./styles/types.js";

function partialPropsToProps(
  partialProps: Partial<Props<PropSchema>> | undefined,
  propSchema: PropSchema,
): Props<PropSchema> {
  const props: Props<PropSchema> = partialProps || {};

  Object.entries(propSchema._zodSource._zod.def.shape).forEach(
    ([propKey, propValue]) => {
      if (props[propKey] === undefined) {
        if (propValue instanceof z.$ZodDefault) {
          props[propKey] = propValue._zod.def.defaultValue;
        }
        if (propValue instanceof z.$ZodOptional) {
          props[propKey] = undefined;
        }
      }
    },
  );
  return props;
}

function textStringToStyledText(text: string): StyledText<any> {
  return {
    type: "text",
    styles: {},
    text,
  };
}

function partialLinkToLink(partialLink: PartialLink<StyleSchema>): Link<any> {
  return {
    type: "link",
    href: partialLink.href,
    content:
      typeof partialLink.content === "string"
        ? [textStringToStyledText(partialLink.content)]
        : partialLink.content,
  };
}

export function partialInlineContentToInlineContent(
  partialInlineContent:
    | PartialInlineContent<InlineContentSchema, StyleSchema>
    | undefined,
  inlineContentSchema: InlineContentSchema,
): InlineContent<any, any>[] {
  if (partialInlineContent === undefined) {
    return [];
  }

  if (typeof partialInlineContent === "string") {
    return [textStringToStyledText(partialInlineContent)];
  }

  return partialInlineContent.map((partialInlineContentElement) => {
    if (typeof partialInlineContentElement === "string") {
      return textStringToStyledText(partialInlineContentElement);
    }

    if (isPartialLinkInlineContent(partialInlineContentElement)) {
      return partialLinkToLink(partialInlineContentElement);
    }

    if (isStyledTextInlineContent(partialInlineContentElement)) {
      return partialInlineContentElement;
    }

    const content = partialInlineContentElement.content;
    const inlineContentConfig =
      inlineContentSchema[partialInlineContentElement.type];

    if (typeof inlineContentConfig === "string") {
      throw new Error(
        "unexpected, should be custom inline content (not 'text' or 'link'",
      );
    }

    return {
      type: partialInlineContentElement.type,
      props: partialPropsToProps(
        partialInlineContentElement.props,
        inlineContentConfig.propSchema,
      ),
      content:
        typeof content === "undefined"
          ? undefined
          : typeof content === "string"
            ? [textStringToStyledText(content)]
            : content,
    };
  });
}

export function partialTableContentToTableContent(
  partialTableContent: PartialTableContent<InlineContentSchema, StyleSchema>,
  inlineContentSchema: InlineContentSchema,
): TableContent<any, any> {
  const rows: {
    cells: TableCell<InlineContentSchema, StyleSchema>[];
  }[] = partialTableContent.rows.map((row) => {
    return {
      cells: row.cells.map((cell) => {
        const fullCell = mapTableCell(cell);
        // `mapTableCell` doesn't actually convert `PartialInlineContent` to
        // `InlineContent`, so this is done manually here.
        fullCell.content = partialInlineContentToInlineContent(
          fullCell.content,
          inlineContentSchema,
        );

        return fullCell;
      }),
    };
  });

  const columnWidths = partialTableContent.columnWidths || [];
  if (!partialTableContent.columnWidths) {
    for (const cell of rows[0].cells) {
      for (let i = 0; i < (cell.props?.colspan || 1); i++) {
        columnWidths.push(undefined);
      }
    }
  }

  return {
    type: "tableContent",
    headerRows: partialTableContent.headerRows,
    headerCols: partialTableContent.headerCols,
    columnWidths: columnWidths,
    rows,
  };
}

function partialBlockContentToBlockContent(
  partialBlockContent:
    | PartialTableContent<InlineContentSchema, StyleSchema>
    | PartialInlineContent<InlineContentSchema, StyleSchema>
    | undefined,
  content: "table" | "inline" | "none",
  inlineContentSchema: InlineContentSchema,
):
  | TableContent<InlineContentSchema, StyleSchema>
  | InlineContent<InlineContentSchema, StyleSchema>[]
  | undefined {
  if (content === "table") {
    partialBlockContent = partialBlockContent || {
      type: "tableContent",
      rows: [],
    };

    if (
      typeof partialBlockContent !== "object" ||
      !("type" in partialBlockContent) ||
      partialBlockContent.type !== "tableContent"
    ) {
      throw new Error("Invalid partial block content");
    }

    return partialTableContentToTableContent(
      partialBlockContent,
      inlineContentSchema,
    );
  } else if (content === "inline") {
    partialBlockContent = partialBlockContent || undefined;

    if (
      typeof partialBlockContent === "object" &&
      "type" in partialBlockContent
    ) {
      throw new Error("Invalid partial block content. Table content passed!?");
    }

    return partialInlineContentToInlineContent(
      partialBlockContent,
      inlineContentSchema,
    );
  } else if (content === "none") {
    return undefined;
  } else {
    throw new UnreachableCaseError(content);
  }
}

export function partialBlockToBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: CustomBlockNoteSchema<BSchema, I, S>,
  partialBlock: PartialBlock<BSchema, I, S>,
): Block<BSchema, I, S> {
  const id = partialBlock.id || UniqueID.options.generateID();

  // Note: we might want to make "type" required for partial blocks and remove this default
  const type: string = partialBlock.type || "paragraph";

  const props = partialPropsToProps(
    partialBlock.props,
    schema.blockSchema[type].propSchema,
  );

  const content = partialBlockContentToBlockContent(
    partialBlock.content,
    schema.blockSchema[type].content,
    schema.inlineContentSchema,
  );

  const children =
    partialBlock.children?.map((child) => partialBlockToBlock(schema, child)) ||
    [];

  return {
    id,
    type,
    props,
    content,
    children,
  } as Block<BSchema, I, S>;
}

export function partialBlocksToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: CustomBlockNoteSchema<BSchema, I, S>,
  partialBlocks: PartialBlock<BSchema, I, S>[],
): Block<BSchema, I, S>[] {
  return partialBlocks.map((partialBlock) =>
    partialBlockToBlock(schema, partialBlock),
  );
}
