import {
  BlockConfig,
  BlockImplementation,
  BlockNoDefaults,
  BlockNoteEditor,
  BlockNoteExtension,
  BlockSpec,
  camelToDataKebab,
  CustomBlockImplementation,
  inheritedProps,
  mergeCSSClasses,
  Props,
  PropSchema,
} from "@blocknote/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useReactNodeView,
} from "@tiptap/react";
import { FC, ReactNode } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil.js";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

export type ReactCustomBlockRenderProps<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" = "inline" | "none",
> = {
  block: BlockNoDefaults<
    Record<TName, BlockConfig<TName, TProps, TContent>>,
    any,
    any
  >;
  editor: BlockNoteEditor<
    Record<TName, BlockConfig<TName, TProps, TContent>>,
    any,
    any
  >;
  contentRef: (node: HTMLElement | null) => void;
};

// extend BlockConfig but use a React render function
export type ReactCustomBlockImplementation<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" = "inline" | "none",
> = Omit<
  CustomBlockImplementation<TName, TProps, TContent>,
  "render" | "toExternalHTML"
> & {
  render: FC<ReactCustomBlockRenderProps<TName, TProps, TContent>>;
  toExternalHTML?: FC<ReactCustomBlockRenderProps<TName, TProps, TContent>>;
};

export type ReactCustomBlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" = "inline" | "none",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: ReactCustomBlockImplementation<T, PS, C>;
  extensions?: BlockNoteExtension<any>[];
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
export function BlockContentWrapper<
  BType extends string,
  PSchema extends PropSchema,
>(props: {
  blockType: BType;
  blockProps: Props<PSchema>;
  propSchema: PSchema;
  isFileBlock?: boolean;
  domAttributes?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    // Creates `blockContent` element
    <NodeViewWrapper
      onDragOver={(event: DragEvent) => event.preventDefault()}
      // Adds custom HTML attributes
      {...Object.fromEntries(
        Object.entries(props.domAttributes || {}).filter(
          ([key]) => key !== "class",
        ),
      )}
      // Sets blockContent class
      className={mergeCSSClasses(
        "bn-block-content",
        props.domAttributes?.class || "",
      )}
      // Sets content type attribute
      data-content-type={props.blockType}
      // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
      // props which are already added as HTML attributes to the parent
      // `blockContent` element (inheritedProps) and props set to their default
      // values
      {...Object.fromEntries(
        Object.entries(props.blockProps)
          .filter(([prop, value]) => {
            const spec = props.propSchema[prop];
            return !inheritedProps.includes(prop) && value !== spec.default;
          })
          .map(([prop, value]) => {
            return [camelToDataKebab(prop), value];
          }),
      )}
      data-file-block={props.isFileBlock === true || undefined}
    >
      {props.children}
    </NodeViewWrapper>
  );
}

export function createReactBlockSpec<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none",
  TOptions extends Record<string, any> | undefined = undefined,
>(
  blockConfigOrCreator:
    | BlockConfig<TName, TProps, TContent>
    | (TOptions extends undefined
        ? () => BlockConfig<TName, TProps, TContent>
        : (options: Partial<TOptions>) => BlockConfig<TName, TProps, TContent>),
  blockImplementationOrCreator:
    | ReactCustomBlockImplementation<TName, TProps, TContent>
    | (TOptions extends undefined
        ? () => ReactCustomBlockImplementation<TName, TProps, TContent>
        : (
            options: Partial<TOptions>,
          ) => ReactCustomBlockImplementation<TName, TProps, TContent>),
  extensionsOrCreator?:
    | BlockNoteExtension<any>[]
    | (TOptions extends undefined
        ? () => BlockNoteExtension<any>[]
        : (options: Partial<TOptions>) => BlockNoteExtension<any>[]),
): (options?: TOptions) => BlockSpec<TName, TProps, TContent> {
  return (options = {} as TOptions) => {
    const blockConfig =
      typeof blockConfigOrCreator === "function"
        ? blockConfigOrCreator(options as any)
        : blockConfigOrCreator;

    const blockImplementation =
      typeof blockImplementationOrCreator === "function"
        ? blockImplementationOrCreator(options as any)
        : blockImplementationOrCreator;

    const extensions = extensionsOrCreator
      ? typeof extensionsOrCreator === "function"
        ? extensionsOrCreator(options as any)
        : extensionsOrCreator
      : undefined;

    return {
      config: blockConfig,
      implementation: {
        ...blockImplementation,
        toExternalHTML(block, editor) {
          const BlockContent =
            blockImplementation.toExternalHTML || blockImplementation.render;
          const output = renderToDOMSpec((refCB) => {
            return (
              <BlockContentWrapper
                blockType={block.type}
                blockProps={block.props}
                propSchema={blockConfig.propSchema}
                domAttributes={this.blockContentDOMAttributes}
              >
                <BlockContent
                  block={block as any}
                  editor={editor as any}
                  contentRef={(element) => {
                    refCB(element);
                    if (element) {
                      element.className = mergeCSSClasses(
                        "bn-inline-content",
                        element.className,
                      );
                    }
                  }}
                />
              </BlockContentWrapper>
            );
          }, editor);
          return output;
        },
        render(block, editor) {
          if (this.renderType === "nodeView") {
            return ReactNodeViewRenderer(
              () => {
                const ref = useReactNodeView().nodeViewContentRef;

                if (!ref) {
                  throw new Error("nodeViewContentRef is not set");
                }

                const BlockContent = blockImplementation.render;
                return (
                  <BlockContentWrapper
                    blockType={block.type}
                    blockProps={block.props}
                    propSchema={blockConfig.propSchema}
                    isFileBlock={!!blockConfig.meta?.fileBlockAccept}
                    domAttributes={this.blockContentDOMAttributes}
                  >
                    <BlockContent
                      block={block as any}
                      editor={editor as any}
                      contentRef={(element) => {
                        ref(element);
                        if (element) {
                          element.className = mergeCSSClasses(
                            "bn-inline-content",
                            element.className,
                          );
                          element.dataset.nodeViewContent = "";
                        }
                      }}
                    />
                  </BlockContentWrapper>
                );
              },
              {
                className: "bn-react-node-view-renderer",
              },
            )(this.props!) as ReturnType<BlockImplementation["render"]>;
          } else {
            const BlockContent = blockImplementation.render;
            const output = renderToDOMSpec((refCB) => {
              return (
                <BlockContentWrapper
                  blockType={block.type}
                  blockProps={block.props}
                  propSchema={blockConfig.propSchema}
                  domAttributes={this.blockContentDOMAttributes}
                >
                  <BlockContent
                    block={block as any}
                    editor={editor as any}
                    contentRef={(element) => {
                      refCB(element);
                      if (element) {
                        element.className = mergeCSSClasses(
                          "bn-inline-content",
                          element.className,
                        );
                      }
                    }}
                  />
                </BlockContentWrapper>
              );
            }, editor);
            return output;
          }
        },
      },
      extensions: extensions,
    };
  };
}
