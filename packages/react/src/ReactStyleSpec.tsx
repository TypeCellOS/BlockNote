import {
  BlockNoteDOMAttributes,
  createInternalStyleSpec,
  StyleConfig,
} from "@blocknote/core";
import { Mark } from "@tiptap/react";
import { createContext, FC } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// extend BlockConfig but use a React render function
export type ReactCustomStyleImplementation<T extends StyleConfig> = {
  render: T["propSchema"] extends "boolean"
    ? FC<{ contentRef: (el: HTMLElement | null) => void }>
    : FC<{ contentRef: (el: HTMLElement | null) => void; value: string }>;
};

const BlockNoteDOMAttributesContext = createContext<BlockNoteDOMAttributes>({});

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
      const props: any = {};

      if (styleConfig.propSchema === "string") {
        props.value = mark.attrs.stringValue;
      }

      const Content = styleImplementation.render;

      let contentDOM: HTMLElement | undefined;
      const div = document.createElement("div");
      const root = createRoot(div);
      flushSync(() => {
        root.render(
          <Content
            {...props}
            contentRef={(el) => (contentDOM = el || undefined)}
          />
        );
      });

      return {
        dom: div.firstElementChild! as HTMLElement,
        contentDOM,
      };
    },
  });

  return createInternalStyleSpec(styleConfig, {
    mark,
  });
}
