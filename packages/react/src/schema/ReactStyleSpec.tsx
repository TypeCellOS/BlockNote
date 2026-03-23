import {
  BlockNoteEditor,
  StyleConfig,
  addStyleAttributes,
  createInternalStyleSpec,
  getStyleParseRules,
  stylePropsToAttributes,
} from "@blocknote/core";
import {
  Mark,
  ReactMarkViewContext,
  ReactMarkViewRenderer,
} from "@tiptap/react";
import { FC, useContext } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil.js";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// extend BlockConfig but use a React render function
export type ReactCustomStyleImplementation<T extends StyleConfig> = {
  render: FC<{
    value: T["propSchema"] extends "boolean" ? undefined : string;
    contentRef: (el: HTMLElement | null) => void;
    editor: BlockNoteEditor<any, any, any>;
  }>;
  runsBefore?: string[];
};

/**
 * Creates a custom style specification for use with React. This is the React
 * counterpart to the vanilla `createStyleSpec` and lets you define custom text
 * styles (e.g., font color, highlight) using React components for rendering.
 *
 * @param styleConfig - The style configuration, including its `type` name and
 * `propSchema` (`"boolean"` or `"string"`).
 * @param styleImplementation - The React implementation, including a `render`
 * component that receives the style value, a `contentRef`, and the editor.
 * @returns A style spec that can be passed to the editor's schema.
 */
export function createReactStyleSpec<T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: ReactCustomStyleImplementation<T>,
) {
  const mark = Mark.create({
    name: styleConfig.type,

    addAttributes() {
      return stylePropsToAttributes(styleConfig.propSchema);
    },

    parseHTML() {
      return getStyleParseRules(styleConfig);
    },

    renderHTML({ mark }) {
      const Content = styleImplementation.render;
      const renderResult = renderToDOMSpec(
        (ref) => (
          <Content
            editor={this.options.editor}
            value={
              styleConfig.propSchema === "boolean"
                ? undefined
                : mark.attrs.stringValue
            }
            contentRef={(element) => {
              ref(element);
              if (element) {
                element.dataset.editable = "";
              }
            }}
          />
        ),
        this.options.editor,
      );

      return addStyleAttributes(
        renderResult,
        styleConfig.type,
        mark.attrs.stringValue,
        styleConfig.propSchema,
      );
    },
    addMarkView() {
      const editor: BlockNoteEditor<any, any, any> = this.options.editor;

      return (markViewProps) => {
        const renderResult = ReactMarkViewRenderer((props) => {
          const ref = useContext(ReactMarkViewContext).markViewContentRef;

          if (!ref) {
            throw new Error("markViewContentRef is not set");
          }

          const Content = styleImplementation.render;
          return (
            <Content
              editor={editor}
              contentRef={(element) => {
                ref(element);
                if (element) {
                  element.dataset.markViewContent = "";
                }
              }}
              value={
                styleConfig.propSchema === "boolean"
                  ? undefined
                  : props.mark.attrs.stringValue
              }
            />
          );
        })(markViewProps);

        /**
         * See https://github.com/ueberdosis/tiptap/blob/5ba480bcd97a0e92f889019f1a65fc67fd3506f9/packages/react/src/ReactMarkViewRenderer.tsx#L98-L103
         * If the `contentRef` is not set synchronously, the contentDOM will be null
         * This is a hack to make sure that it is always defined so that Prosemirror can insert the content into the correct position
         *
         * (This is only an issue with Firefox)
         */
        (renderResult as any).didMountContentDomElement = true;

        return renderResult;
      };
    },
  });

  return createInternalStyleSpec(styleConfig, {
    ...styleImplementation,
    mark,
    render(value, editor) {
      const Content = styleImplementation.render;
      const output = renderToDOMSpec(
        (ref) => (
          <Content
            editor={editor}
            value={value}
            contentRef={(element) => {
              ref(element);
              if (element) {
                element.dataset.editable = "";
              }
            }}
          />
        ),
        editor,
      );

      return addStyleAttributes(
        output,
        styleConfig.type,
        value,
        styleConfig.propSchema,
      );
    },
    toExternalHTML(value, editor) {
      const Content = styleImplementation.render;
      const output = renderToDOMSpec(
        (ref) => (
          <Content
            editor={editor}
            value={value}
            contentRef={(element) => {
              ref(element);
              if (element) {
                element.dataset.editable = "";
              }
            }}
          />
        ),
        editor,
      );

      return addStyleAttributes(
        output,
        styleConfig.type,
        value,
        styleConfig.propSchema,
      );
    },
  });
}
