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
import { getImageDimensions } from "./imageUtil.js";

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
  private pictures: Map<
    string,
    {
      file: Blob;
      fileName: string;
      height: number;
      width: number;
    }
  > = new Map();
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
    const pictures = Array.from(this.pictures.values());
    const fonts = await this.loadFonts();

    const content = (
      <OfficeDocument>
        <office:font-face-decls>
          {fonts.map((font) => {
            return (
              <style:font-face
                style:name={font.name}
                svg:font-family={font.name}>
                <svg:font-face-src>
                  <svg:font-face-uri
                    xlink:href={`Fonts/${font.fileName}`}
                    xlink:type="simple">
                    <svg:font-face-format svg:string="truetype" />
                  </svg:font-face-uri>
                </svg:font-face-src>
              </style:font-face>
            );
          })}
        </office:font-face-decls>
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
        <OfficeBody>
          <OfficeText>{blockcontent}</OfficeText>
        </OfficeBody>
      </OfficeDocument>
    );

    const manifest = (
      <Manifest manifest:version="1.3">
        <ManifestFileEntry
          mediaType="application/vnd.oasis.opendocument.text"
          fullPath="/"
        />
        <ManifestFileEntry mediaType="text/xml" fullPath="content.xml" />
        <ManifestFileEntry mediaType="text/xml" fullPath="styles.xml" />
        {pictures.map((picture) => {
          return (
            <ManifestFileEntry
              mediaType={picture.file.type}
              fullPath={`Pictures/${picture.fileName}`}
            />
          );
        })}
        {fonts.map((font) => {
          return (
            <ManifestFileEntry
              mediaType="application/x-font-ttf"
              fullPath={`Fonts/${font.fileName}`}
            />
          );
        })}
      </Manifest>
    );
    const zipWriter = new ZipWriter(
      new BlobWriter("application/vnd.oasis.opendocument.text")
    );

    // Add mimetype first, uncompressed
    zipWriter.add(
      "mimetype",
      new TextReader("application/vnd.oasis.opendocument.text"),
      {
        compressionMethod: 0,
        level: 0,
        dataDescriptor: false,
        extendedTimestamp: false,
      }
    );

    const contentXml = renderToString(content);
    const manifestXml = renderToString(manifest);

    zipWriter.add("content.xml", new TextReader(contentXml));
    zipWriter.add("styles.xml", new TextReader(stylesXml));
    zipWriter.add("META-INF/manifest.xml", new TextReader(manifestXml));
    fonts.forEach((font) => {
      zipWriter.add(`Fonts/${font.fileName}`, new BlobReader(font.data));
    });
    pictures.forEach((picture) => {
      zipWriter.add(
        `Pictures/${picture.fileName}`,
        new BlobReader(picture.file)
      );
    });

    return zipWriter.close();
  }

  public registerStyle(style: (name: string) => React.ReactNode): string {
    const styleName = `BN_S${++this.styleCounter}`;
    this.automaticStyles.set(styleName, style(styleName));
    return styleName;
  }
  public async registerPicture(url: string): Promise<{
    path: string;
    mimeType: string;
    height: number;
    width: number;
  }> {
    if (this.pictures.has(url)) {
      const picture = this.pictures.get(url)!;

      return {
        path: `Pictures/${picture.fileName}`,
        mimeType: picture.file.type,
        height: picture.height,
        width: picture.width,
      };
    }

    const blob = await this.resolveFile(url);
    const fileExtension = url.split(".").pop();
    const fileName = `picture-${this.pictures.size}.${fileExtension}`;
    const { width, height } = await getImageDimensions(blob);

    this.pictures.set(url, {
      file: blob,
      fileName: fileName,
      height,
      width,
    });

    return { path: `Pictures/${fileName}`, mimeType: blob.type, height, width };
  }
}
