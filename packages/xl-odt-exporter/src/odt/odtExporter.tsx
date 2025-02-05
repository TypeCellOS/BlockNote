import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import { BlobWriter, TextReader, ZipWriter, BlobReader } from "@zip.js/zip.js";
import { renderToString } from "react-dom/server";
import stylesXml from "./template/styles.xml?raw";
import {
  Manifest,
  ManifestFileEntry,
  OfficeBody,
  OfficeDocument,
  OfficeText,
  StyleStyle,
  StyleTextProperties,
  TextSpan,
} from "./util/components.js";
import { loadFileBuffer } from "@shared/util/fileUtil.js";

export class ODTExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> extends Exporter<
  B,
  I,
  S,
  React.ReactNode,
  React.ReactNode,
  Record<string, string>,
  React.ReactNode
> {
  private automaticStyles: Map<string, React.ReactNode> = new Map();
  private styleCounter = 0;

  public readonly options: ExporterOptions;

  constructor(
    protected readonly schema: BlockNoteSchema<B, I, S>,
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      React.ReactNode,
      React.ReactNode,
      Record<string, string>,
      React.ReactNode
    >["mappings"],
    options?: Partial<ExporterOptions>
  ) {
    const defaults = {
      colors: COLORS_DEFAULT,
    } satisfies Partial<ExporterOptions>;

    super(schema, mappings, { ...defaults, ...options });
    this.options = { ...defaults, ...options };
  }

  protected async loadFonts() {
    const interFont = await loadFileBuffer(
      await import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf")
    );
    const geistMonoFont = await loadFileBuffer(
      await import("@shared/assets/fonts/GeistMono-Regular.ttf")
    );

    return [
      {
        name: "Inter",
        fileName: "Inter_18pt-Regular.ttf",
        data: new Blob([interFont], { type: "font/ttf" }),
      },
      {
        name: "Geist Mono",
        fileName: "GeistMono-Regular.ttf",
        data: new Blob([geistMonoFont], { type: "font/ttf" }),
      },
    ];
  }

  public transformStyledText(styledText: StyledText<S>): React.ReactNode {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);

    if (Object.keys(styles).length === 0) {
      return styledText.text;
    }

    const styleName = `BN_T${++this.styleCounter}`;

    // Store the complete style element
    this.automaticStyles.set(
      styleName,
      <StyleStyle style:name={styleName} style:family="text">
        <StyleTextProperties {...styles} />
      </StyleStyle>
    );

    return <TextSpan text:style-name={styleName}>{styledText.text}</TextSpan>;
  }

  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0
  ): Promise<React.ReactNode[]> {
    const ret: React.ReactNode[] = [];
    let numberedListIndex = 0;

    for (const block of blocks) {
      if (block.type === "numberedListItem") {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }

      const children = await this.transformBlocks(
        block.children,
        nestingLevel + 1
      );

      const content = await this.mapBlock(
        block as any,
        nestingLevel,
        numberedListIndex
      );

      ret.push(content);
      if (children.length > 0) {
        ret.push(...children);
      }
    }

    return ret;
  }

  public async toODTDocument(
    blocks: Block<B, I, S>[],
    options?: {
      header?: string;
      footer?: string;
    }
  ): Promise<Blob> {
    const blockcontent = await this.transformBlocks(blocks);
    const styles = Array.from(this.automaticStyles.values());
    const fonts = await this.loadFonts();

    const content = (
      <OfficeDocument>
        <office:automatic-styles>{styles}</office:automatic-styles>
        {(options?.header || options?.footer) && (
          <office:master-styles>
            <style:master-page
              style:name="Standard"
              style:page-layout-name="Mpm1"
              draw:style-name="Mdp1">
              {options.header && (
                <style:header>
                  <text:p text:style-name="MP1">{options.header}</text:p>
                </style:header>
              )}
              {options.footer && (
                <style:footer>
                  <text:p text:style-name="MP2">{options.footer}</text:p>
                </style:footer>
              )}
            </style:master-page>
          </office:master-styles>
        )}
        <office:font-face-decls>
          {fonts.map((font) => {
            return (
              <style:font-face
                style:name={font.name}
                svg:font-family={font.name}>
                <svg:font-face-src>
                  <svg:font-face-uri xlink:href={font.fileName}>
                    <svg:font-face-format svg:string="truetype" />
                  </svg:font-face-uri>
                </svg:font-face-src>
              </style:font-face>
            );
          })}
        </office:font-face-decls>
        <OfficeBody>
          <OfficeText>{blockcontent}</OfficeText>
        </OfficeBody>
      </OfficeDocument>
    );

    const manifest = (
      <Manifest>
        <ManifestFileEntry
          mediaType="application/vnd.oasis.opendocument.text"
          fullPath="/"
        />
        <ManifestFileEntry mediaType="text/xml" fullPath="content.xml" />
        <ManifestFileEntry mediaType="text/xml" fullPath="styles.xml" />
      </Manifest>
    );
    const zipWriter = new ZipWriter(
      new BlobWriter("application/vnd.oasis.opendocument.text")
    );

    // Add mimetype first, uncompressed
    zipWriter.add(
      "mimetype",
      new TextReader("application/vnd.oasis.opendocument.text")
    );

    const contentXml = renderToString(content);
    const manifestXml = renderToString(manifest);

    zipWriter.add("content.xml", new TextReader(contentXml));
    zipWriter.add("styles.xml", new TextReader(stylesXml));
    zipWriter.add("META-INF/manifest.xml", new TextReader(manifestXml));
    fonts.forEach((font) => {
      zipWriter.add(`fonts/${font.fileName}`, new BlobReader(font.data));
    });

    return zipWriter.close();
  }

  public registerStyle(style: (name: string) => React.ReactNode): string {
    const styleName = `BN_S${++this.styleCounter}`;
    this.automaticStyles.set(styleName, style(styleName));
    return styleName;
  }
}
