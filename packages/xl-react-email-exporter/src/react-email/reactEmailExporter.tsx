import {
    Block,
    BlockNoteSchema,
    BlockSchema,
    COLORS_DEFAULT,
    DefaultProps,
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
    Tailwind  } from "@react-email/components";
  import { render as renderEmail } from "@react-email/render";

import React from "react";
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
  
    public async transformBlocks(
      blocks: Block<B, I, S>[],
      nestingLevel = 0
    ): Promise<React.ReactElement<any>[]> {
      const ret: React.ReactElement<any>[] = [];
      let i = 0;
      while (i < blocks.length) {
        const b = blocks[i];
        // Group only consecutive list items of the same type
        if (b.type === "bulletListItem" || b.type === "numberedListItem") {
          const listType = b.type;
          const listItems: React.ReactElement<any>[] = [];
          let j = i;
          let startIndex = 1;
          while (
            j < blocks.length &&
            blocks[j].type === listType // Only group same-type
          ) {
            const block = blocks[j];
            const liContent = await this.mapBlock(block as any, nestingLevel, startIndex) as any;
            let nestedList: React.ReactElement<any>[] = [];
            if (block.children && block.children.length > 0) {
              // Group children by consecutive list type and render each group
              let k = 0;
              while (k < block.children.length) {
                const child = block.children[k];
                if (child.type === "bulletListItem" || child.type === "numberedListItem") {
                  const childListType = child.type;
                  const childListItems: React.ReactElement<any>[] = [];
                  let l = k;
                  let childStartIndex = 1;
                  while (
                    l < block.children.length &&
                    block.children[l].type === childListType // Only group same-type
                  ) {
                    const childBlock = block.children[l];
                    const childLiContent = await this.mapBlock(childBlock as any, nestingLevel + 1, childStartIndex) as any;
                    let childNestedList: React.ReactElement<any>[] = [];
                    if (childBlock.children && childBlock.children.length > 0) {
                      const grouped = await this.transformBlocks(childBlock.children, nestingLevel + 2);
                      childNestedList = grouped;
                    }
                    childListItems.push(
                      <React.Fragment key={childBlock.id}>
                        {childLiContent}
                        {childNestedList.length > 0 && childNestedList}
                      </React.Fragment>
                    );
                    l++;
                    childStartIndex++;
                  }
                  // Wrap in correct list type
                  if (childListType === "bulletListItem") {
                    nestedList.push(
                      <ul className="list-disc pl-6 mb-2" key={block.id + "-ul-nested-" + k}>
                        {childListItems}
                      </ul>
                    );
                  } else {
                    nestedList.push(
                      <ol className="list-decimal pl-6 mb-2" start={1} key={block.id + "-ol-nested-" + k}>
                        {childListItems}
                      </ol>
                    );
                  }
                  k = l;
                } else {
                  // Non-list child, render as normal
                  const childBlocks = await this.transformBlocks([child], nestingLevel + 1);
                  nestedList.push(...childBlocks);
                  k++;
                }
              }
            }
            listItems.push(
              <React.Fragment key={block.id}>
                {liContent}
                {nestedList.length > 0 && nestedList}
              </React.Fragment>
            );
            j++;
            startIndex++;
          }
          // Wrap in <ul> or <ol>
          if (listType === "bulletListItem") {
            ret.push(
              <ul className="list-disc pl-6 mb-2" key={b.id + "-ul"}>
                {listItems}
              </ul>
            );
          } else {
            ret.push(
              <ol className="list-decimal pl-6 mb-2" start={1} key={b.id + "-ol"}>
                {listItems}
              </ol>
            );
          }
          i = j;
          continue;
        }
        // Non-list blocks
        const children = await this.transformBlocks(b.children, nestingLevel + 1);
        const self = await this.mapBlock(b as any, nestingLevel, 0) as any;
        const style = this.blocknoteDefaultPropsToReactEmailStyle(b.props as any);
        ret.push(
          <React.Fragment key={b.id}>
            <Section style={style}>{self}</Section>
            {children.length > 0 && (
              <Section style={{ marginLeft: 10, ...style }}>{children}</Section>
            )}
          </React.Fragment>
        );
        i++;
      }
      return ret;
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
    public async toReactEmailDocument(blocks: Block<B, I, S>[]) {

      const transformedBlocks = await this.transformBlocks(blocks);
      return renderEmail(
        <Html>
        <Head>{this.renderFonts()}</Head>
        {/* <Preview>
        TODO
        </Preview> */}
        <Body>
          <Tailwind>
            <Container>{transformedBlocks}</Container>
          </Tailwind>
        </Body>
      </Html>
      );
    }


    protected blocknoteDefaultPropsToReactEmailStyle(
      props: Partial<DefaultProps>,
    ): any {
      return {
        textAlign: props.textAlignment,
        backgroundColor:
          props.backgroundColor === "default" || !props.backgroundColor
            ? undefined
            : this.options.colors[
                props.backgroundColor as keyof typeof this.options.colors
              ].background,
        color:
          props.textColor === "default" || !props.textColor
            ? undefined
            : this.options.colors[
                props.textColor as keyof typeof this.options.colors
              ].text,
        alignItems:
          props.textAlignment === "right"
            ? "flex-end"
            : props.textAlignment === "center"
              ? "center"
              : undefined,
      };
    }
  }