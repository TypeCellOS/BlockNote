import {
  BlockNoteDOMAttributes,
  createInternalStyleSpec,
  mergeCSSClasses,
  StyleConfig,
  UnreachableCaseError,
} from "@blocknote/core";
import { Mark, NodeViewContent } from "@tiptap/react";
import { createContext, ElementType, FC, HTMLProps, useContext } from "react";
import { renderToString } from "react-dom/server";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// extend BlockConfig but use a React render function
export type ReactCustomStyleImplementation<T extends StyleConfig> = {
  render: T["propSchema"] extends "boolean" ? FC : FC<{ value: string }>;
};

const BlockNoteDOMAttributesContext = createContext<BlockNoteDOMAttributes>({});

export const InlineContent = <Tag extends ElementType>(
  props: { as?: Tag } & HTMLProps<Tag>
) => {
  const inlineContentDOMAttributes =
    useContext(BlockNoteDOMAttributesContext).inlineContent || {};

  const classNames = mergeCSSClasses(
    props.className || "",
    "bn-inline-content",
    inlineContentDOMAttributes.class
  );

  return (
    <NodeViewContent
      {...Object.fromEntries(
        Object.entries(inlineContentDOMAttributes).filter(
          ([key]) => key !== "class"
        )
      )}
      {...props}
      className={classNames}
    />
  );
};

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactStyleSpec<T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: ReactCustomStyleImplementation<T>
) {
  const mark = Mark.create({
    name: styleConfig.type,

    addAttributes() {
      if (styleConfig.propSchema === "boolean") {
        return {};
      }
      return {
        stringValue: {
          default: undefined,
          // TODO: parsing

          // parseHTML: (element) =>
          //   element.getAttribute(`data-${styleConfig.type}`),
          // renderHTML: (attributes) => ({
          //   [`data-${styleConfig.type}`]: attributes.stringValue,
          // }),
        },
      };
    },

    renderHTML({ mark }) {
      if (styleConfig.propSchema === "boolean") {
        const Content = styleImplementation.render as FC;
        const parent = document.createElement("div");
        parent.innerHTML = renderToString(<Content />);

        return {
          dom: parent.firstElementChild! as HTMLElement,
          contentDOM: (parent.querySelector(".bn-inline-content") ||
            undefined) as HTMLElement | undefined,
        };
      } else if (styleConfig.propSchema === "string") {
        const Content = styleImplementation.render as FC<{ value: string }>;
        const parent = document.createElement("div");
        parent.innerHTML = renderToString(
          <Content value={mark.attrs.stringValue} />
        );

        return {
          dom: parent.firstElementChild! as HTMLElement,
          contentDOM: (parent.querySelector(".bn-inline-content") ||
            undefined) as HTMLElement | undefined,
        };
      } else {
        throw new UnreachableCaseError(styleConfig.propSchema);
      }
    },
  });

  return createInternalStyleSpec(styleConfig, {
    mark,
  });
}
