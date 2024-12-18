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
import AdmZip from "adm-zip";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import stylesXml from "./template/styles.xml?raw";
import {
  Manifest,
  ManifestFileEntry,
  OfficeBody,
  OfficeDocument,
  OfficeText,
} from "./util/components.js";

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

  public transformStyledText(styledText: StyledText<S>): React.ReactNode {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);
    return createElement("text:span", styles, styledText.text);
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

  public async toODTDocument(blocks: Block<B, I, S>[]): Promise<Blob> {
    const content = (
      <OfficeDocument>
        <OfficeBody>
          <OfficeText>{await this.transformBlocks(blocks)}</OfficeText>
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

    const zip = new AdmZip();

    // Add mimetype first, uncompressed
    zip.addFile(
      "mimetype",
      Buffer.from("application/vnd.oasis.opendocument.text")
    );

    // Then add other files
    const contentXml = renderToString(content);
    const manifestXml = renderToString(manifest);

    // console.log("Styles XML:", stylesXml);
    // console.log("Content XML before zip:", contentXml);

    zip.addFile("content.xml", Buffer.from(contentXml));
    zip.addFile("styles.xml", Buffer.from(stylesXml));
    zip.addFile("META-INF/manifest.xml", Buffer.from(manifestXml));

    zip.writeZip("test.zip.odt");
    return new Blob([zip.toBuffer()], {
      type: "application/vnd.oasis.opendocument.text",
    });
  }
}
