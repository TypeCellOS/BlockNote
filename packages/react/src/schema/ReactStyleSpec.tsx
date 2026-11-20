import {
  BlockNoteEditor,
  type Extension,
  type ExtensionFactoryInstance,
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
import { FC, useCallback, useContext } from "react";
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
 * @param extensions - BlockNote extensions registered with this style.
 * @returns A style spec that can be passed to the editor's schema.
 */
export function createReactStyleSpec<T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: ReactCustomStyleImplementation<T>,
  extensions?: (Extension | ExtensionFactoryInstance)[],
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

      return ReactMarkViewRenderer((props) => {
        const ref = useContext(ReactMarkViewContext).markViewContentRef;

        if (!ref) {
          throw new Error("markViewContentRef is not set");
        }

        const view = props.view;
        const contentRef = useCallback(
          (element: HTMLElement | null) => {
            ref(element);
            if (element) {
              element.dataset.markViewContent = "";
              // React can attach this content after ProseMirror maps selection.
              // EditorView.focus() resyncs it from the current editor state.
              // Wait until the commit/transaction finishes, and only reconcile
              // an already-focused editor.
              queueMicrotask(() => {
                if (!view.isDestroyed && view.hasFocus()) {
                  view.focus();
                }
              });
            }
          },
          [ref, view],
        );

        const Content = styleImplementation.render;
        return (
          <Content
            editor={editor}
            contentRef={contentRef}
            value={
              styleConfig.propSchema === "boolean"
                ? undefined
                : props.mark.attrs.stringValue
            }
          />
        );
      });
    },
  });

  return createInternalStyleSpec(
    styleConfig,
    {
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
    },
    extensions,
  );
}
