import { Block, PartialBlock } from "../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContent,
  InlineContentConfig,
  InlineContentSchema,
  Link,
  PartialInlineContent,
  PartialInlineContentElement,
  PartialLink,
  PartialTableContent,
  Props,
  PropSchema,
  StyledText,
  StyleSchema,
  TableCell,
  TableContent,
} from "../schema/index.js";

const partialPropsToProps = (
  partialProps: Partial<Props<PropSchema>> | undefined,
  propSchema: PropSchema,
): Record<string, string | number | boolean | undefined> =>
  Object.fromEntries(
    Object.entries(propSchema).map(([propName, propSpec]) => {
      if (
        partialProps &&
        propName in partialProps &&
        partialProps[propName] !== undefined
      ) {
        const propTypeMatches =
          typeof partialProps[propName] ===
          (propSpec.default !== undefined
            ? typeof propSpec.default
            : propSpec.type);
        const propValueIsValid =
          propSpec.values === undefined
            ? true
            : propSpec.values.includes(partialProps[propName]);

        if (propTypeMatches && propValueIsValid) {
          return [propName, partialProps[propName]];
        }
      }

      return [propName, propSpec.default];
    }),
  );

const textStringToStyledText = (text: string): StyledText<any> => ({
  type: "text",
  styles: {},
  text: text,
});

const partialLinkToLink = (
  partialLink: PartialLink<StyleSchema>,
): Link<any> => ({
  type: "link",
  href: partialLink.href,
  content:
    typeof partialLink.content === "string"
      ? [textStringToStyledText(partialLink.content)]
      : partialLink.content,
});

const partialInlineContentElementIsStyledText = (
  partialInlineContentElement: PartialInlineContentElement<
    InlineContentSchema,
    StyleSchema
  >,
  inlineContentConfig: InlineContentConfig,
): partialInlineContentElement is StyledText<StyleSchema> =>
  typeof partialInlineContentElement !== "string" &&
  inlineContentConfig === "text";

const partialInlineContentElementIsPartialLink = (
  partialInlineContentElement: PartialInlineContentElement<
    InlineContentSchema,
    StyleSchema
  >,
  inlineContentConfig: InlineContentConfig,
): partialInlineContentElement is PartialLink<StyleSchema> =>
  typeof partialInlineContentElement !== "string" &&
  inlineContentConfig === "link";

const partialInlineContentToInlineContent = (
  partialInlineContent:
    | PartialInlineContent<InlineContentSchema, StyleSchema>
    | undefined,
  inlineContentSchema: InlineContentSchema,
): InlineContent<any, any>[] => {
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

    const inlineContentConfig =
      inlineContentSchema[partialInlineContentElement.type];

    if (
      partialInlineContentElementIsStyledText(
        partialInlineContentElement,
        inlineContentConfig,
      )
    ) {
      return partialInlineContentElement;
    }

    if (
      partialInlineContentElementIsPartialLink(
        partialInlineContentElement,
        inlineContentConfig,
      )
    ) {
      return partialLinkToLink(partialInlineContentElement);
    }

    // Couldn't get a proper type guard for these instead.
    const content: StyledText<StyleSchema>[] | string | undefined =
      partialInlineContentElement.content;
    if (typeof inlineContentConfig === "string") {
      throw new Error("");
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
};

const partialTableContentToTableContent = (
  partialTableContent: PartialTableContent<InlineContentSchema, StyleSchema>,
  inlineContentSchema: InlineContentSchema,
): TableContent<any, any> => {
  const columnWidths: undefined[] = [];
  const rows: {
    cells: TableCell<InlineContentSchema, StyleSchema>[];
  }[] = partialTableContent.rows.map((row, rowIndex) => {
    return {
      cells: row.cells.map((cell) => {
        if (typeof cell === "object" && "type" in cell) {
          if (rowIndex === 0) {
            for (let i = 0; i < (cell.props?.colspan || 1); i++) {
              columnWidths.push(undefined);
            }
          }

          return {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              ...cell.props,
            },
            content: partialInlineContentToInlineContent(
              cell.content,
              inlineContentSchema,
            ),
          };
        }

        columnWidths.push(undefined);

        return {
          type: "tableCell",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: partialInlineContentToInlineContent(
            cell,
            inlineContentSchema,
          ),
        };
      }),
    };
  });

  return {
    type: "tableContent",
    headerRows: partialTableContent.headerRows,
    headerCols: partialTableContent.headerCols,
    columnWidths: partialTableContent.columnWidths || columnWidths,
    rows,
  };
};

const partialBlockContentToBlockContent = (
  partialBlockContent:
    | PartialTableContent<InlineContentSchema, StyleSchema>
    | PartialInlineContent<InlineContentSchema, StyleSchema>
    | undefined,
  content: "table" | "inline" | "none",
  inlineContentSchema: InlineContentSchema,
):
  | TableContent<InlineContentSchema, StyleSchema>
  | InlineContent<InlineContentSchema, StyleSchema>[]
  | undefined => {
  if (content === "table") {
    if (
      typeof partialBlockContent === "object" &&
      "type" in partialBlockContent
    ) {
      return partialTableContentToTableContent(
        partialBlockContent,
        inlineContentSchema,
      );
    }

    if (partialBlockContent === undefined) {
      return {
        type: "tableContent",
        columnWidths: [undefined],
        rows: [
          {
            cells: [[{ type: "text", styles: {}, text: "" }]],
          },
        ],
      };
    }

    return {
      type: "tableContent",
      columnWidths: [undefined],
      rows: [
        {
          cells: [
            partialInlineContentToInlineContent(
              partialBlockContent,
              inlineContentSchema,
            ),
          ],
        },
      ],
    };
  }

  if (content === "inline") {
    if (
      typeof partialBlockContent === "object" &&
      "type" in partialBlockContent
    ) {
      const cell = partialTableContentToTableContent(
        partialBlockContent,
        inlineContentSchema,
      ).rows[0].cells[0];

      if (typeof cell === "object" && "type" in cell) {
        return cell.content;
      }

      return cell;
    }

    if (partialBlockContent === undefined) {
      return [{ type: "text", styles: {}, text: "" }];
    }

    return partialInlineContentToInlineContent(
      partialBlockContent,
      inlineContentSchema,
    );
  }

  return undefined;
};

export const partialBlockToBlock = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  partialBlock: PartialBlock<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>,
): Block<BSchema, I, S> => {
  const id = partialBlock.id || "";

  const type: string = partialBlock.type || "paragraph";

  const props = partialPropsToProps(
    partialBlock.props,
    editor.schema.blockSchema[type].propSchema,
  );

  const content = partialBlockContentToBlockContent(
    partialBlock.content,
    editor.schema.blockSchema[type].content,
    editor.schema.inlineContentSchema,
  );

  const children =
    partialBlock.children?.map((child) => partialBlockToBlock(child, editor)) ||
    [];

  return {
    id,
    type,
    props,
    content,
    children,
  } as Block<BSchema, I, S>;
};
