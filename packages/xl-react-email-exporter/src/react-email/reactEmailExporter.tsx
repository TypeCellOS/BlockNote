import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";

import { Exporter, ExporterOptions } from "@blocknote/core";

import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Section,
} from "@react-email/components";
import { CSSProperties } from "react";

export class ReactEmailExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> extends Exporter<
  B,
  I,
  S,
  React.ReactElement<any>,
  React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>,
  CSSProperties,
  React.ReactElement<HTMLSpanElement>
> {
  public constructor(
    public readonly schema: BlockNoteSchema<B, I, S>,
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      React.ReactElement<any>,
      React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>,
      CSSProperties,
      React.ReactElement<HTMLSpanElement>
    >["mappings"],
    options?: Partial<ExporterOptions>
  ) {
    const defaults = {
      colors: COLORS_DEFAULT,
    } satisfies Partial<ExporterOptions>;

    const newOptions = {
      ...defaults,
      ...options,
    };
    super(schema, mappings, newOptions);
  }

  public transformStyledText(styledText: StyledText<S>) {
    const stylesArray = this.mapStyles(styledText.styles);
    const styles = Object.assign({}, ...stylesArray);
    return <span style={styles}>{styledText.text}</span>;
  }

  public transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0
  ): React.ReactElement<Text>[] {
    return blocks.map((b) => {
      const children = this.transformBlocks(b.children, nestingLevel + 1);
      const self = this.mapBlock(b as any, nestingLevel, 0); // TODO: any

      return (
        <>
          {self}
          {children.length > 0 && (
            <Section style={{ marginLeft: 10 }}>{children}</Section>
          )}
        </>
      );
    });
  }

  public renderFonts() {
    return (
      <>
        <Font
          fallbackFontFamily="Helvetica"
          fontFamily="Inter"
          fontStyle="normal"
          fontWeight={400}
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2",
            format: "woff2",
          }}
        />
        <Font
          fallbackFontFamily="Helvetica"
          fontFamily="Inter"
          fontStyle="normal"
          fontWeight={600}
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50PDca1ZL7.woff2",
            format: "woff2",
          }}
        />
        <Font
          fallbackFontFamily="Helvetica"
          fontFamily="Inter"
          fontStyle="normal"
          fontWeight={700}
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50BTca1ZL7.woff2",
            format: "woff2",
          }}
        />
      </>
    );
  }
  public toReactEmailDocument(blocks: Block<B, I, S>[]) {
    // this.registerFonts();
    return (
      <Html>
        <Head>{this.renderFonts()}</Head>
        {/* <Preview>
        TODO
        </Preview> */}
        <Body>
          <Container>{this.transformBlocks(blocks)}</Container>
        </Body>
      </Html>
    );
  }
}
