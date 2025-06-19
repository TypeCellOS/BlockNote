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
  
    private async renderGroupedListBlocks(
      blocks: Block<B, I, S>[],
      startIndex: number,
      nestingLevel: number
    ): Promise<{ element: React.ReactElement, nextIndex: number }> {
      const listType = blocks[startIndex].type;
      const listItems: React.ReactElement<any>[] = [];
      let j = startIndex;
      let itemIndex = 1;
      while (
        j < blocks.length &&
        blocks[j].type === listType
      ) {
        const block = blocks[j];
        const liContent = await this.mapBlock(block as any, nestingLevel, itemIndex) as any;
        let nestedList: React.ReactElement<any>[] = [];
        if (block.children && block.children.length > 0) {
          nestedList = await this.renderNestedLists(block.children, nestingLevel + 1, block.id);
        }
        listItems.push(
          <React.Fragment key={block.id}>
            {liContent}
            {nestedList.length > 0 && nestedList}
          </React.Fragment>
        );
        j++;
        itemIndex++;
      }
      let element: React.ReactElement;
      if (listType === "bulletListItem") {
        element = (
          <ul className="list-disc pl-6 mb-2" key={blocks[startIndex].id + "-ul"}>
            {listItems}
          </ul>
        );
      } else {
        element = (
          <ol className="list-decimal pl-6 mb-2" start={1} key={blocks[startIndex].id + "-ol"}>
            {listItems}
          </ol>
        );
      }
      return { element, nextIndex: j };
    }

    private async renderNestedLists(
      children: Block<B, I, S>[],
      nestingLevel: number,
      parentId: string
    ): Promise<React.ReactElement<any>[]> {
      const nestedList: React.ReactElement<any>[] = [];
      let k = 0;
      while (k < children.length) {
        const child = children[k];
        if (child.type === "bulletListItem" || child.type === "numberedListItem") {
          const childListType = child.type;
          const childListItems: React.ReactElement<any>[] = [];
          let l = k;
          let childStartIndex = 1;
          while (
            l < children.length &&
            children[l].type === childListType
          ) {
            const childBlock = children[l];
            const childLiContent = await this.mapBlock(childBlock as any, nestingLevel, childStartIndex) as any;
            const style = this.blocknoteDefaultPropsToReactEmailStyle(childBlock.props as any);
            let nestedListContent: React.ReactElement<any>[] = [];
            if (childBlock.children && childBlock.children.length > 0) {
              // Check if children are list items
              if (
                childBlock.children[0] &&
                (childBlock.children[0].type === "bulletListItem" || childBlock.children[0].type === "numberedListItem")
              ) {
                // Render nested list inside this <li>
                nestedListContent = await this.renderNestedLists(childBlock.children, nestingLevel + 1, childBlock.id);
              } else {
                // Render non-list children as block content inside this <li>
                nestedListContent = await this.transformBlocks(childBlock.children, nestingLevel + 1);
              }
            }
            childListItems.push(
              <li key={childBlock.id} style={style}>
                {childLiContent}
                {nestedListContent.length > 0 && nestedListContent}
              </li>
            );
            l++;
            childStartIndex++;
          }
          if (childListType === "bulletListItem") {
            nestedList.push(
              <ul className="list-disc pl-6 mb-2" key={parentId + "-ul-nested-" + k}>
                {childListItems}
              </ul>
            );
          } else {
            nestedList.push(
              <ol className="list-decimal pl-6 mb-2" start={1} key={parentId + "-ol-nested-" + k}>
                {childListItems}
              </ol>
            );
          }
          k = l;
        } else {
          // Non-list child, render as normal (do not wrap in Section here)
          const childBlocks = await this.transformBlocks([child], nestingLevel);
          nestedList.push(...childBlocks);
          k++;
        }
      }
      return nestedList;
    }

    public async transformBlocks(
      blocks: Block<B, I, S>[],
      nestingLevel = 0
    ): Promise<React.ReactElement<any>[]> {
      const ret: React.ReactElement<any>[] = [];
      let i = 0;
      while (i < blocks.length) {
        const b = blocks[i];
        if (b.type === "bulletListItem" || b.type === "numberedListItem") {
          const { element, nextIndex } = await this.renderGroupedListBlocks(blocks, i, nestingLevel);
          ret.push(element);
          i = nextIndex;
          continue;
        }
        // Non-list blocks
        const children = await this.transformBlocks(b.children, nestingLevel + 1);
        const self = await this.mapBlock(b as any, nestingLevel, 0) as any;
        const style = this.blocknoteDefaultPropsToReactEmailStyle(b.props as any);
        ret.push(
          <React.Fragment key={b.id}>
            <Section style={style}>{self}</Section>
            {children.length > 0 && children}
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