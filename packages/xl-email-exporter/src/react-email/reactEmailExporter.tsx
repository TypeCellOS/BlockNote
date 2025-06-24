import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  DefaultProps,
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";
import { render as renderEmail } from "@react-email/render";
import React, { CSSProperties } from "react";

export class ReactEmailExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
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
    options?: Partial<ExporterOptions>,
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
    nestingLevel: number,
  ): Promise<{ element: React.ReactElement; nextIndex: number }> {
    const listType = blocks[startIndex].type;
    const listItems: React.ReactElement<any>[] = [];
    let j = startIndex;

    for (
      let itemIndex = 1;
      j < blocks.length && blocks[j].type === listType;
      j++, itemIndex++
    ) {
      const block = blocks[j];
      const liContent = (await this.mapBlock(
        block as any,
        nestingLevel,
        itemIndex,
      )) as any;
      let nestedList: React.ReactElement<any>[] = [];
      if (block.children && block.children.length > 0) {
        nestedList = await this.renderNestedLists(
          block.children,
          nestingLevel + 1,
          block.id,
        );
      }
      listItems.push(
        <React.Fragment key={block.id}>
          {liContent}
          {nestedList.length > 0 && nestedList}
        </React.Fragment>,
      );
    }
    let element: React.ReactElement;
    if (listType === "bulletListItem" || listType === "toggleListItem") {
      element = (
        <ul className="mb-2 list-disc pl-6" key={blocks[startIndex].id + "-ul"}>
          {listItems}
        </ul>
      );
    } else {
      element = (
        <ol
          className="mb-2 list-decimal pl-6"
          start={1}
          key={blocks[startIndex].id + "-ol"}
        >
          {listItems}
        </ol>
      );
    }
    return { element, nextIndex: j };
  }

  private async renderNestedLists(
    children: Block<B, I, S>[],
    nestingLevel: number,
    parentId: string,
  ): Promise<React.ReactElement<any>[]> {
    const nestedList: React.ReactElement<any>[] = [];
    let i = 0;
    while (i < children.length) {
      const child = children[i];
      if (
        child.type === "bulletListItem" ||
        child.type === "numberedListItem"
      ) {
        // Group consecutive list items of the same type
        const listType = child.type;
        const listItems: React.ReactElement<any>[] = [];
        let j = i;

        for (
          let itemIndex = 1;
          j < children.length && children[j].type === listType;
          j++, itemIndex++
        ) {
          const listItem = children[j];
          const liContent = (await this.mapBlock(
            listItem as any,
            nestingLevel,
            itemIndex,
          )) as any;
          const style = this.blocknoteDefaultPropsToReactEmailStyle(
            listItem.props as any,
          );
          let nestedContent: React.ReactElement<any>[] = [];
          if (listItem.children && listItem.children.length > 0) {
            // If children are list items, render as nested list; otherwise, as normal blocks
            if (
              listItem.children[0] &&
              (listItem.children[0].type === "bulletListItem" ||
                listItem.children[0].type === "numberedListItem")
            ) {
              nestedContent = await this.renderNestedLists(
                listItem.children,
                nestingLevel + 1,
                listItem.id,
              );
            } else {
              nestedContent = await this.transformBlocks(
                listItem.children,
                nestingLevel + 1,
              );
            }
          }
          listItems.push(
            <li key={listItem.id} style={style}>
              {liContent}
              {nestedContent.length > 0 && (
                <div style={{ marginTop: "8px" }}>{nestedContent}</div>
              )}
            </li>,
          );
        }
        if (listType === "bulletListItem") {
          nestedList.push(
            <ul
              className="mb-2 list-disc pl-6"
              key={parentId + "-ul-nested-" + i}
            >
              {listItems}
            </ul>,
          );
        } else {
          nestedList.push(
            <ol
              className="mb-2 list-decimal pl-6"
              start={1}
              key={parentId + "-ol-nested-" + i}
            >
              {listItems}
            </ol>,
          );
        }
        i = j;
      } else {
        // Non-list child, render as normal with indentation
        const childBlocks = await this.transformBlocks([child], nestingLevel);
        nestedList.push(
          <Section key={child.id} style={{ marginLeft: "24px" }}>
            {childBlocks}
          </Section>,
        );
        i++;
      }
    }
    return nestedList;
  }

  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0,
  ): Promise<React.ReactElement<any>[]> {
    const ret: React.ReactElement<any>[] = [];
    let i = 0;
    while (i < blocks.length) {
      const b = blocks[i];
      if (b.type === "bulletListItem" || b.type === "numberedListItem") {
        const { element, nextIndex } = await this.renderGroupedListBlocks(
          blocks,
          i,
          nestingLevel,
        );
        ret.push(element);
        i = nextIndex;
        continue;
      }
      // Non-list blocks
      const children = await this.transformBlocks(b.children, nestingLevel + 1);
      const self = (await this.mapBlock(b as any, nestingLevel, 0)) as any;
      const style = this.blocknoteDefaultPropsToReactEmailStyle(b.props as any);
      ret.push(
        <React.Fragment key={b.id}>
          <Section style={style}>{self}</Section>
          {children.length > 0 && (
            <div style={{ marginLeft: "24px" }}>{children}</div>
          )}
        </React.Fragment>,
      );
      i++;
    }
    return ret;
  }

  public async toReactEmailDocument(
    blocks: Block<B, I, S>[],
    options?: {
      /**
       * Inject elements into the {@link Head} element
       * @see https://react.email/docs/components/head
       */
      head?: React.ReactElement;
      /**
       * Set the preview text for the email
       * @see https://react.email/docs/components/preview
       */
      preview?: string | string[];
      /**
       * Add a header to every page.
       * The React component passed must be a React-Email component
       * @see https://react.email/components
       */
      header?: React.ReactElement;
      /**
       * Add a footer to every page.
       * The React component passed must be a React-Email component
       * @see https://react.email/components
       */
      footer?: React.ReactElement;
    },
  ) {
    const transformedBlocks = await this.transformBlocks(blocks);
    return renderEmail(
      <Html>
        <Head>{options?.head}</Head>
        <Body
          style={{
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "16px",
            lineHeight: "1.5",
            color: "#333",
          }}
        >
          {options?.preview && <Preview>{options.preview}</Preview>}
          <Tailwind>
            <Container>
              {options?.header}
              {transformedBlocks}
              {options?.footer}
            </Container>
          </Tailwind>
        </Body>
      </Html>,
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
