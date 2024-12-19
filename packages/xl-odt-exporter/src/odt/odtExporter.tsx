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

  private blockPropsToStyles(
    props: Record<string, any>
  ): Record<string, string> {
    const styles: Record<string, string> = {};

    if (props.textAlignment) {
      styles["fo:text-align"] = props.textAlignment;
    }

    if (props.backgroundColor && props.backgroundColor !== "default") {
      const color =
        this.options.colors[
          props.backgroundColor as keyof typeof this.options.colors
        ].background;
      styles["fo:background-fill"] = color;
    }

    return styles;
  }

  public transformStyledText(styledText: StyledText<S>): React.ReactNode {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);

    if (Object.keys(styles).length === 0) {
      return styledText.text;
    }

    const styleName = `T${++this.styleCounter}`;

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
        block,
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
    const blockcontent = await this.transformBlocks(blocks);
    const styles = Array.from(this.automaticStyles.values());

    const content = (
      <OfficeDocument>
        <office:automatic-styles>{styles}</office:automatic-styles>
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

    const zip = new AdmZip();

    // Add mimetype first, uncompressed
    zip.addFile(
      "mimetype",
      Buffer.from("application/vnd.oasis.opendocument.text")
    );

    const contentXml = renderToString(content);
    const manifestXml = renderToString(manifest);

    zip.addFile("content.xml", Buffer.from(contentXml));
    zip.addFile("styles.xml", Buffer.from(stylesXml));
    zip.addFile("META-INF/manifest.xml", Buffer.from(manifestXml));

    zip.writeZip("test.zip.odt");
    return new Blob([zip.toBuffer()], {
      type: "application/vnd.oasis.opendocument.text",
    });
  }

  public registerStyle(style: (name: string) => React.ReactNode): string {
    const styleName = `S${++this.styleCounter}`;
    this.automaticStyles.set(styleName, style(styleName));
    return styleName;
  }
}
