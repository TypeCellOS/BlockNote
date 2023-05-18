import {
  BlockConfig,
  BlockSpec,
  createBlockSpec,
  PropSchema,
} from "@blocknote/core";
import { createRoot } from "react-dom/client";

// extend BlockConfig but use a react render function
export type ReactBlockConfig<
  Type extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean
> = Omit<BlockConfig<Type, PSchema, ContainsInlineContent>, "render"> & {
  render: (props: {
    block: any;
    editor: any;
    contentRef: any;
  }) => React.ReactNode;
};

export function createReactBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean
>(
  blockConfig: ReactBlockConfig<BType, PSchema, ContainsInlineContent>
): BlockSpec<BType, PSchema> {
  const rootEl = document.createElement("div");
  const root = createRoot(rootEl);

  const contentDOM = blockConfig.containsInlineContent
    ? document.createElement("div")
    : undefined;

  return createBlockSpec<BType, PSchema, ContainsInlineContent>({
    ...blockConfig,
    render: (block: any, editor: any) => {
      console.log("render root");
      const node = blockConfig.render({
        block,
        editor,
        contentRef: (el: any) => {
          if (el && !el.contains(contentDOM)) {
            console.log("append");
            el.appendChild(contentDOM);
          }
        },
      });
      root.render(node);

      if (blockConfig.containsInlineContent) {
        return {
          dom: rootEl,
          contentDOM,
        } as any; // TODO
      } else {
        return {
          dom: rootEl,
        } as any; // TODO
      }
    },
  });
}
