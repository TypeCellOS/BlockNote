import {
  Block,
  BlockFromConfig,
  BlockNoteSchema,
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";

import {
  BlockMapping,
  InlineContentMapping,
  StyleMapping,
} from "../mapping.js";

import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { CSSProperties } from "react";

export class ReactEmailExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema
> {
  public constructor(
    public readonly schema: BlockNoteSchema<B, I, S>,
    public readonly mappings: {
      styleMapping: StyleMapping<NoInfer<S>, CSSProperties>;
      blockMapping: BlockMapping<
        B,
        I,
        S,
        React.ReactElement<typeof Text>,
        (
          ic: InlineContent<InlineContentSchema, StyleSchema>[]
        ) => React.ReactElement<typeof Text>
      >;
      inlineContentMapping: InlineContentMapping<
        I,
        S,
        React.ReactElement<typeof Link> | React.ReactElement<HTMLSpanElement>,
        (s: StyledText<StyleSchema>) => React.ReactElement<HTMLSpanElement>
      >;
    }
  ) {}

  public transformStyledText(styledText: StyledText<S>) {
    const stylesArray = Object.entries(styledText.styles).map(
      ([key, value]) => {
        const mappedStyle = this.mappings.styleMapping[key](value);
        return mappedStyle;
      }
    );
    const styles = Object.assign({}, ...stylesArray);
    return <span style={styles}>{styledText.text}</span>;
  }

  public transformInlineContent(inlineContent: InlineContent<I, S>) {
    return this.mappings.inlineContentMapping[inlineContent.type](
      inlineContent,
      this.transformStyledText.bind(this) as any // TODO
    );
  }

  public transformInlineContentArray(
    inlineContentArray: InlineContent<I, S>[]
  ) {
    return inlineContentArray.map((ic) => this.transformInlineContent(ic));
  }

  public transformBlock(
    block: BlockFromConfig<B[keyof B], I, S>,
    nestingLevel: number
  ) {
    return this.mappings.blockMapping[block.type](
      block,
      this.transformInlineContentArray.bind(this) as any, // not ideal as any
      nestingLevel
    );
  }

  public transformBlocks(
    blocks: Block<B, I, S>[], // Or BlockFromConfig<B[keyof B], I, S>?
    nestingLevel = 0
  ): React.ReactElement<Text>[] {
    return blocks.map((b) => {
      const children = this.transformBlocks(b.children, nestingLevel + 1);
      const self = this.transformBlock(b as any, nestingLevel); // TODO: any

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
