import { useComponentsContext } from "@blocknote/react";
import { NodeView } from "prosemirror-view";
import { BlockNoteEditor, propsToAttributes } from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewRenderer,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import {
  createStronglyTypedTiptapNode,
  createInternalInlineContentSpec,
} from "@blocknote/core";
import { mergeAttributes } from "@tiptap/core";
import { ChangeEvent, useEffect, useState, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./styles.css";

function LaTexView() {
  const nodeView:
    | ((this: {
        name: string;
        options: any;
        storage: any;
        editor: any;
        type: any;
        parent: any;
      }) => NodeViewRenderer)
    | null = function () {
    const BlockContent = (props: NodeViewProps & { selectionHack: any }) => {
      /* eslint-disable react-hooks/rules-of-hooks */
      const editor: BlockNoteEditor<any> = this.options.editor;
      const content = props.node.textContent;
      const open = props.node.attrs.open;
      const textareaRef = useRef<HTMLTextAreaElement | null>(null);
      const contentRef = useRef<HTMLElement | null>(null);
      const [html, setHtml] = useState("");
      const [loading, setLoading] = useState(false);
      const Components = useComponentsContext()!;

      useEffect(() => {
        setLoading(true);
        const html = katex.renderToString(content, {
          throwOnError: false,
        });
        setHtml(html);
        setLoading(false);
      }, [content]);

      useEffect(() => {
        if (open) {
          if (contentRef.current) {
            contentRef.current.click();
          }
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current?.focus();
              textareaRef.current?.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
              );
            }
          });
        }
      }, [open]);

      const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = props.getPos?.();
        const node = props.node;
        const view = editor._tiptapEditor.view;

        const tr = view.state.tr.replaceWith(
          pos,
          pos + node.nodeSize,
          view.state.schema.nodes.latex.create(
            {
              ...node.attrs,
            },
            val ? view.state.schema.text(val) : null
          )
        );

        view.dispatch(tr);
      };

      return (
        <NodeViewWrapper as={"span"}>
          <Components.Generic.Popover.Root>
            <Components.Generic.Popover.Trigger>
              <span className={"latex"} ref={contentRef}>
                {loading ? (
                  <span className={"latex-loading"}>latex loading...</span>
                ) : (
                  <span
                    className={"latex-content"}
                    dangerouslySetInnerHTML={{ __html: html }}></span>
                )}
              </span>
            </Components.Generic.Popover.Trigger>
            <Components.Generic.Popover.Content
              className={"bn-popover-content bn-form-popover"}
              variant={"form-popover"}>
              <textarea
                ref={textareaRef}
                className={"latex-textarea"}
                value={content}
                onChange={handleChange}
              />
            </Components.Generic.Popover.Content>
          </Components.Generic.Popover.Root>
        </NodeViewWrapper>
      );
    };

    return (props) => {
      if (!(props.editor as any).contentComponent) {
        return {};
      }
      const ret = ReactNodeViewRenderer(BlockContent, {
        stopEvent: () => true,
      })(props) as NodeView;
      ret.setSelection = (anchor, head) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ret as any).renderer.updateProps({
          selectionHack: { anchor, head },
        });
      };

      (ret as any).contentDOMElement = undefined;

      const oldUpdated = ret.update!.bind(ret);
      ret.update = (node, outerDeco, innerDeco) => {
        const retAsAny = ret as any;
        let decorations = retAsAny.decorations;
        if (
          retAsAny.decorations.decorations !== outerDeco ||
          retAsAny.decorations.innerDecorations !== innerDeco
        ) {
          decorations = {
            decorations: outerDeco,
            innerDecorations: innerDeco,
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return oldUpdated(node, decorations, undefined as any);
      };
      return ret;
    };
  };
  return nodeView;
}

const propSchema = {
  open: {
    type: "boolean",
    default: false,
  },
};

const node = createStronglyTypedTiptapNode({
  name: "latex",
  inline: true,
  group: "inline",
  content: "inline*",
  editable: true,
  selectable: false,

  addAttributes() {
    return propsToAttributes(propSchema);
  },

  parseHTML() {
    return [
      {
        tag: "latex",
        priority: 200,
        node: "latex",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "latex",
      mergeAttributes(HTMLAttributes, {
        "data-content-type": this.name,
      }),
      0,
    ];
  },

  addNodeView: LaTexView(),
});

export const LaTex = createInternalInlineContentSpec(
  {
    content: "styled",
    type: "latex",
    propSchema: propSchema,
  },
  {
    node,
  }
);
