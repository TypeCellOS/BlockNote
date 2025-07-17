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
import { loadFileBuffer } from "@shared/util/fileUtil.js";
import { getImageDimensions } from "@shared/util/imageUtil.js";
import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { renderToString } from "react-dom/server";
import stylesXml from "./template/styles.xml?raw";

export class ODTExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends Exporter<
  B,
  I,
  S,
  React.ReactNode,
  React.ReactNode,
  Record<string, string>,
  React.ReactNode
> {
  // "Styles" to be added to the AutomaticStyles section of the ODT file
  // Keyed by the style name
  private automaticStyles: Map<string, React.ReactNode> = new Map();

  // "Pictures" to be added to the Pictures folder in the ODT file
  // Keyed by the original image URL
  private pictures = new Map<
    string,
    {
      file: Blob;
      fileName: string;
      height: number;
      width: number;
    }
  >();

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
    options?: Partial<ExporterOptions>,
  ) {
    const defaults = {
      colors: COLORS_DEFAULT,
    } satisfies Partial<ExporterOptions>;

    super(schema, mappings, { ...defaults, ...options });
    this.options = { ...defaults, ...options };
  }

  protected async loadFonts() {
    const interFont = await loadFileBuffer(
      await import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf"),
    );
    const geistMonoFont = await loadFileBuffer(
      await import("@shared/assets/fonts/GeistMono-Regular.ttf"),
    );

    return [
      {
        name: "Inter 18pt",
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
      <style:style style:name={styleName} style:family="text">
        <style:text-properties {...styles} />
      </style:style>,
    );

    return <text:span text:style-name={styleName}>{styledText.text}</text:span>;
  }

  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0,
  ): Promise<Awaited<React.ReactNode>[]> {
    const ret: Awaited<React.ReactNode>[] = [];
    let numberedListIndex = 0;

    for (const block of blocks) {
      if (block.type === "numberedListItem") {
        numberedListIndex++;
      } else {
        numberedListIndex = 0;
      }

      if (["columnList", "column"].includes(block.type)) {
        const children = await this.transformBlocks(block.children, 0);
        const content = await this.mapBlock(
          block as any,
          0,
          numberedListIndex,
          children,
        );

        ret.push(content);
      } else {
        const children = await this.transformBlocks(
          block.children,
          nestingLevel + 1,
        );
        const content = await this.mapBlock(
          block as any,
          nestingLevel,
          numberedListIndex,
          children,
        );

        ret.push(content);
        if (children.length > 0) {
          ret.push(...children);
        }
      }
    }

    return ret;
  }

  public async toODTDocument(
    blocks: Block<B, I, S>[],
    options?: {
      header?: string | XMLDocument;
      footer?: string | XMLDocument;
    },
  ): Promise<Blob> {
    const xmlOptionToString = (xmlDocument: string | XMLDocument) => {
      const xmlNamespacesRegEx =
        /<([a-zA-Z0-9:]+)\s+?(?:xml)ns(?::[a-zA-Z0-9]+)?=".*"(.*)>/g;
      let stringifiedDoc = "";

      if (typeof xmlDocument === "string") {
        stringifiedDoc = xmlDocument;
      } else {
        const serializer = new XMLSerializer();

        stringifiedDoc = serializer.serializeToString(xmlDocument);
      }

      // Detect and remove XML namespaces (already defined in the root element)
      return stringifiedDoc.replace(xmlNamespacesRegEx, "<$1$2>");
    };
    const blockContent = await this.transformBlocks(blocks);
    const styles = Array.from(this.automaticStyles.values());
    const pictures = Array.from(this.pictures.values());
    const fonts = await this.loadFonts();
    const header = xmlOptionToString(options?.header || "");
    const footer = xmlOptionToString(options?.footer || "");

    const content = (
      <office:document-content
        xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
        xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
        xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
        xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
        xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
        xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
        xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"
        office:version="1.3"
      >
        <office:font-face-decls>
          {fonts.map((font) => {
            return (
              <style:font-face
                style:name={font.name}
                svg:font-family={font.name}
                style:font-pitch="variable"
              >
                <svg:font-face-src>
                  <svg:font-face-uri
                    xlink:href={`Fonts/${font.fileName}`}
                    xlink:type="simple"
                    loext:font-style="normal"
                    loext:font-weight="normal"
                  >
                    <svg:font-face-format svg:string="truetype" />
                  </svg:font-face-uri>
                </svg:font-face-src>
              </style:font-face>
            );
          })}
        </office:font-face-decls>
        <office:automatic-styles>{styles}</office:automatic-styles>
        {(header || footer) && (
          <office:master-styles>
            <style:master-page
              style:name="Standard"
              style:page-layout-name="Mpm1"
              draw:style-name="Mdp1"
            >
              {header && (
                <style:header
                  dangerouslySetInnerHTML={{
                    __html: header,
                  }}
                ></style:header>
              )}
              {footer && (
                <style:footer
                  dangerouslySetInnerHTML={{
                    __html: footer,
                  }}
                ></style:footer>
              )}
            </style:master-page>
          </office:master-styles>
        )}
        <office:body>
          <office:text>{blockContent}</office:text>
        </office:body>
      </office:document-content>
    );

    const manifestNode = (
      <manifest:manifest
        xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"
        manifest:version="1.3"
      >
        <manifest:file-entry
          manifest:media-type="application/vnd.oasis.opendocument.text"
          manifest:full-path="/"
        />
        <manifest:file-entry
          manifest:media-type="text/xml"
          manifest:full-path="content.xml"
        />
        <manifest:file-entry
          manifest:media-type="text/xml"
          manifest:full-path="styles.xml"
        />
        {pictures.map((picture) => {
          return (
            <manifest:file-entry
              manifest:media-type={picture.file.type}
              manifest:full-path={`Pictures/${picture.fileName}`}
            />
          );
        })}
        {fonts.map((font) => {
          return (
            <manifest:file-entry
              manifest:media-type="application/x-font-ttf"
              manifest:full-path={`Fonts/${font.fileName}`}
            />
          );
        })}
      </manifest:manifest>
    );
    const zipWriter = new ZipWriter(
      new BlobWriter("application/vnd.oasis.opendocument.text"),
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
      },
    );

    const contentXml = renderToString(content);
    const manifestXml = renderToString(manifestNode);

    zipWriter.add("content.xml", new TextReader(contentXml));
    zipWriter.add("styles.xml", new TextReader(stylesXml));
    zipWriter.add("META-INF/manifest.xml", new TextReader(manifestXml));
    fonts.forEach((font) => {
      zipWriter.add(`Fonts/${font.fileName}`, new BlobReader(font.data));
    });
    pictures.forEach((picture) => {
      zipWriter.add(
        `Pictures/${picture.fileName}`,
        new BlobReader(picture.file),
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
    const mimeTypeFileExtensionMap = {
      "image/apng": "apng",
      "image/avif": "avif",
      "image/bmp": "bmp",
      "image/gif": "gif",
      "image/vnd.microsoft.icon": "ico",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/svg+xml": "svg",
      "image/tiff": "tiff",
      "image/webp": "webp",
    };
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
    const fileExtension =
      mimeTypeFileExtensionMap[
        blob.type as keyof typeof mimeTypeFileExtensionMap
      ] || "png";
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
