import {
  BlockFromConfig,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function propsToString(props: Record<string, any>) {
  return Object.entries(props)
    .filter(
      ([_, v]) => v !== undefined && v !== null && v !== "" && v !== "default",
    )
    .map(([k, v]) => {
      if (v === true) {
        return k;
      }
      return `${k}="${v}"`;
    })
    .join(" ");
}

/**
 * Result of exporting blocks to TSX, including the TSX string and block ranges.
 */
export type TsxExportResult = {
  /** The TSX string representation of the blocks */
  tsx: string;
  /** Map of block ID to character range (start, end) in the tsx string */
  blockRanges: Map<string, { start: number; end: number }>;
};

export class TsxExporter<
  B extends BlockSchema = any,
  I extends InlineContentSchema = any,
  S extends StyleSchema = any,
> extends Exporter<B, I, S, string, string, string, string> {
  public constructor(
    schema: BlockNoteSchema<B, I, S>,
    options: Partial<ExporterOptions> = {},
  ) {
    const opts = Object.assign(
      {
        colors: COLORS_DEFAULT,
      },
      options,
    );

    const blockMapping: any = {};
    for (const type of Object.keys(schema.blockSpecs)) {
      const Tag = capitalize(type);
      blockMapping[type] = (
        block: any,
        exporter: Exporter<B, I, S, string, string, string, string>,
        _nestingLevel: number,
        _numberedListIndex: number | undefined,
        children: string[],
      ) => {
        const props = propsToString({ ...block.props, id: block.id });
        const content = exporter.transformInlineContent(block.content).join("");
        const childrenContent = children ? children.join("") : "";
        const inner = `${content}${childrenContent}`;

        const openTag = props ? `<${Tag} ${props}` : `<${Tag}`;

        if (!inner) {
          return `${openTag} />`;
        }

        return `${openTag}>${inner}</${Tag}>`;
      };
    }

    const inlineContentMapping: any = {};
    for (const type of Object.keys(schema.inlineContentSpecs)) {
      if (type === "text") {
        inlineContentMapping[type] = (
          node: StyledText<S>,
          exporter: Exporter<B, I, S, string, string, string, string>,
        ) => exporter.transformStyledText(node);
      } else if (type === "link") {
        inlineContentMapping[type] = (
          node: any,
          exporter: Exporter<B, I, S, string, string, string, string>,
        ) => {
          const content = exporter.transformStyledText(node.content);
          return `<Link href="${node.href}">${content}</Link>`;
        };
      } else {
        const Tag = capitalize(type);
        // Custom inline content
        inlineContentMapping[type] = (node: any) => {
          const props = propsToString(node.props);
          return props ? `<${Tag} ${props} />` : `<${Tag} />`;
        };
      }
    }

    const styleMapping: any = {};
    for (const type of Object.keys(schema.styleSpecs)) {
      const Tag = capitalize(type);
      styleMapping[type] = (
        text: string,
        _exporter: Exporter<B, I, S, string, string, string, string>,
        value: any,
      ) => {
        if (value === true) {
          return `<${Tag}>${text}</${Tag}>`;
        }
        return `<${Tag} value="${value}">${text}</${Tag}>`;
      };
    }

    super(
      schema,
      {
        blockMapping,
        inlineContentMapping,
        styleMapping,
      },
      opts as ExporterOptions,
    );
  }

  public transformStyledText(styledText: StyledText<S>): string {
    let text = styledText.text;
    if (styledText.styles) {
      const styles = styledText.styles as Record<string, any>;
      for (const [styleName, styleValue] of Object.entries(styles)) {
        if (this.mappings.styleMapping[styleName]) {
          text = (this.mappings.styleMapping[styleName] as any)(
            text,
            this,
            styleValue,
          );
        }
      }
    }
    return text;
  }

  /**
   * Convert blocks to TSX string and return block ranges.
   * This is the preferred method as it tracks block positions during serialization.
   */
  public async toTsxWithRanges(
    blocks: BlockFromConfig<B[keyof B], I, S>[],
  ): Promise<TsxExportResult> {
    const blockRanges = new Map<string, { start: number; end: number }>();
    const results: string[] = [];
    let numberedListIndex = 0;
    let currentPosition = 0;

    for (const block of blocks) {
      if (block.type === ("numberedListItem" as any)) {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }

      const start = currentPosition;
      const mappedBlock = await this.serializeBlockWithRanges(
        block as any,
        0,
        numberedListIndex,
        blockRanges,
        currentPosition,
      );
      results.push(mappedBlock);
      currentPosition = start + mappedBlock.length;

      // Track this top-level block's range
      blockRanges.set(block.id, { start, end: currentPosition });

      // Account for newline between blocks
      if (blocks.indexOf(block as any) < blocks.length - 1) {
        currentPosition += 1; // for "\n"
      }
    }

    return {
      tsx: results.join("\n"),
      blockRanges,
    };
  }

  /**
   * Convert blocks to TSX string (legacy method, doesn't return ranges).
   */
  public async toTsx(
    blocks: BlockFromConfig<B[keyof B], I, S>[],
  ): Promise<string> {
    const result = await this.toTsxWithRanges(blocks);
    return result.tsx;
  }

  private async serializeBlockWithRanges(
    block: any,
    nestingLevel: number,
    numberedListIndex: number,
    blockRanges: Map<string, { start: number; end: number }>,
    parentOffset: number,
  ): Promise<string> {
    const childBlocks = block.children || [];
    const mappedChildren: string[] = [];
    let childNumberedIndex = 0;

    // We need to calculate child positions relative to parent
    // This is complex because children are embedded in the parent's content
    // For now, we track top-level blocks; children can be derived later if needed

    for (const child of childBlocks) {
      if (child.type === "numberedListItem") {
        childNumberedIndex++;
      } else {
        childNumberedIndex = 0;
      }
      const childContent = await this.serializeBlockWithRanges(
        child,
        nestingLevel + 1,
        childNumberedIndex,
        blockRanges,
        0, // offset will be calculated after we know parent content
      );
      mappedChildren.push(childContent);
    }

    const serialized = await this.mapBlock(
      block,
      nestingLevel,
      numberedListIndex,
      mappedChildren,
    );

    // For nested blocks, calculate their position within the serialized string
    // The children are embedded so we need to find their actual positions
    let searchPos = 0;
    for (let i = 0; i < childBlocks.length; i++) {
      const child = childBlocks[i];
      const childContent = mappedChildren[i];
      const childStart = serialized.indexOf(childContent, searchPos);
      if (childStart !== -1) {
        blockRanges.set(child.id, {
          start: parentOffset + childStart,
          end: parentOffset + childStart + childContent.length,
        });
        searchPos = childStart + childContent.length;
      }
    }

    return serialized;
  }
}
