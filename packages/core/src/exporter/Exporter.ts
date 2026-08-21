import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import type { Dictionary } from "../i18n/dictionary.js";
import { en } from "../i18n/locales/index.js";
import {
  BlockFromConfig,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  StyledText,
  Styles,
} from "../schema/index.js";
import { isContainerType } from "../schema/blocks/children.js";

import type {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "./mapping.js";

export type ExporterOptions = {
  /**
   * A function that can be used to resolve files, images, etc.
   * Exporters might need the binary contents of files like images,
   * which might not always be available from the same origin as the main page.
   * You can use this option to proxy requests through a server you control
   * to avoid cross-origin (CORS) issues.
   *
   * @default uses a BlockNote hosted proxy (https://corsproxy.api.blocknotejs.org/)
   * @param url - The URL of the file to resolve
   * @returns A Promise that resolves to a string (the URL to use instead of the original)
   * or a Blob (you can return the Blob directly if you have already fetched it)
   */
  resolveFileUrl?: (url: string) => Promise<string | Blob>;
  /**
   * Colors to use for background of blocks, font colors, and highlight colors
   */
  colors: typeof COLORS_DEFAULT;
  /**
   * The strings an exporter renders into the produced document (file link
   * texts, error placeholders). Accepts a locale from
   * `@blocknote/core/locales` or an editor dictionary; block packages that
   * ship their own exporter strings (e.g. math, diagram) read their sections
   * from this same object, exactly as they do from an editor dictionary.
   *
   * @default the English strings
   */
  dictionary?: { exporter: Dictionary["exporter"] } & {
    // Block packages read their own sections (e.g. `math`, `diagram`) from
    // the same object; their types live with those packages.
    [blockDictionary: string]: unknown;
  };
};
export abstract class Exporter<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  RB,
  RI,
  RS,
  TS,
> {
  // Stored with erased generics: a generically-typed property would change
  // the class's variance in B/I/S and break mapping inference at subclass
  // construction sites (the schema param was previously inference-only).
  private readonly blockNoteSchema: BlockNoteSchema<any, any, any>;

  public constructor(
    schema: BlockNoteSchema<B, I, S>,
    protected readonly mappings: {
      blockMapping: BlockMapping<B, I, S, RB, RI>;
      inlineContentMapping: InlineContentMapping<I, S, RI, TS>;
      styleMapping: StyleMapping<S, RS>;
    },
    public readonly options: ExporterOptions,
  ) {
    this.blockNoteSchema = schema;
  }

  /**
   * Whether a block type is a container block (declares `children`, e.g.
   * `columnList`, `column`, or a custom callout). Container mappings own the
   * placement of their children, so exporters must not append the children
   * after the container's own output.
   */
  public isContainerBlock(blockType: string): boolean {
    // Legacy: `@blocknote/xl-multi-column`'s hand-written specs, which have
    // no `children` config. Removed once multi-column is migrated onto the
    // container API.
    if (blockType === "columnList" || blockType === "column") {
      return true;
    }
    const spec = (this.blockNoteSchema.blockSpecs as Record<string, any>)[
      blockType
    ];
    return !!spec && isContainerType(spec.config);
  }

  /**
   * The strings this exporter renders into the produced document - the
   * `exporter` section of the configured dictionary (the `dictionary`
   * option of {@link ExporterOptions}), or the English defaults.
   */
  public get dictionary(): Dictionary["exporter"] {
    return this.options.dictionary?.exporter ?? en.exporter;
  }

  public async resolveFile(url: string) {
    if (!this.options?.resolveFileUrl) {
      return (await fetch(url)).blob();
    }
    const ret = await this.options.resolveFileUrl(url);
    if (ret instanceof Blob) {
      return ret;
    }
    return (await fetch(ret)).blob();
  }

  public mapStyles(styles: Styles<S>) {
    const stylesArray = Object.entries(styles).map(([key, value]) => {
      const mapping = this.mappings.styleMapping[key];
      if (!mapping) {
        throw new Error(
          `Exporter is missing a style mapping for style "${key}". If this style comes from a separate package, spread that package's exporter mappings into your styleMapping.`,
        );
      }
      const mappedStyle = mapping(value, this);
      return mappedStyle;
    });
    return stylesArray;
  }

  public mapInlineContent(inlineContent: InlineContent<I, S>) {
    const mapping = this.mappings.inlineContentMapping[inlineContent.type];
    if (!mapping) {
      throw new Error(
        `Exporter is missing an inline content mapping for inline content type "${inlineContent.type}". If this inline content comes from a separate package, spread that package's exporter mappings into your inlineContentMapping.`,
      );
    }
    return mapping(inlineContent, this);
  }

  public transformInlineContent(inlineContentArray: InlineContent<I, S>[]) {
    return inlineContentArray.map((ic) => this.mapInlineContent(ic));
  }

  public abstract transformStyledText(styledText: StyledText<S>): TS;

  public async mapBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number,
    numberedListIndex: number,
    children?: Array<Awaited<RB>>,
  ) {
    const mapping = this.mappings.blockMapping[block.type];
    if (!mapping) {
      throw new Error(
        this.isContainerBlock(block.type)
          ? `No mapping found for container block type "${block.type}". Container blocks require an explicit block mapping that places their children.`
          : `Exporter is missing a block mapping for block type "${block.type}". If this block comes from a separate package, spread that package's exporter mappings into your blockMapping.`,
      );
    }
    return mapping(block, this, nestingLevel, numberedListIndex, children);
  }
}
