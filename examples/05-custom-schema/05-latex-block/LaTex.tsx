import {
  useComponentsContext,
} from "@blocknote/react";
import { NodeView } from "prosemirror-view";
import { BlockNoteEditor } from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewRenderer,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import "./styles.css";
import { createStronglyTypedTiptapNode, createInternalBlockSpec } from "@blocknote/core";
import { mergeAttributes } from "@tiptap/core";
import { ChangeEvent, useEffect, useState } from "react";

function loadKaTex(callback: () => void) {
  const katexScript = document.getElementById("katex-script");
  const katexLink = document.getElementById("katex-link");
  let scriptLoaded = !!katexScript;
  let linkLoaded = !!katexLink;

  const handleCallback = () => {
    if (scriptLoaded && linkLoaded) {
      setTimeout(callback);
    }
  };

  if (!katexScript) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js";
    script.integrity =
      "sha384-hIoBPJpTUs74ddyc4bFZSM1TVlQDA60VBbJS0oA934VSz82sBx1X7kSx2ATBDIyd";
    script.crossOrigin = "anonymous";
    script.id = "katex-script";
    // script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      handleCallback();
    };
    document.head.appendChild(script);
  }

  if (!katexLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css";
    link.integrity =
      "sha384-wcIxkf4k558AjM3Yz3BBFQUbk/zgIYC2R0QpeeYb+TwlBVMrlgLqwRjRtGZiK7ww";
    link.crossOrigin = "anonymous";
    link.id = "katex-link";
    link.onload = () => {
      linkLoaded = true;
      handleCallback();
    };
    document.head.appendChild(link);
  }

  if (scriptLoaded && linkLoaded) {
    setTimeout(callback);
  }
}

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
      const [html, setHtml] = useState("");
      const [loading, setLoading] = useState(false);
      const Components = useComponentsContext()!;

      useEffect(() => {
        setLoading(true);
        loadKaTex(() => {
          const html = window.katex.renderToString(content, {
            throwOnError: false,
          });
          setHtml(html);
          setLoading(false);
        });
      }, [content]);

      const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = props.getPos?.();
        const node = props.node;
        const view = editor._tiptapEditor.view;
        const tr = view.state.tr
          .replaceWith(pos, pos+node.nodeSize, view.state.schema.nodes.latex.create(
            {
              ...node.attrs,
            },
            view.state.schema.text(val)
          ));

        view.dispatch(tr);
      }
        

      return (
        <NodeViewWrapper as={'span'}>
          <Components.Generic.Popover.Root>
            <Components.Generic.Popover.Trigger>
              <span className={"latex"}>
                {loading ? (
                  <span className={"latex-loading"}>latex loading...</span>
                ) : (
                  <span className={"latex-content"} dangerouslySetInnerHTML={{ __html: html }}></span>
                )}
              </span>
            </Components.Generic.Popover.Trigger>
            <Components.Generic.Popover.Content
              className={"bn-popover-content bn-form-popover"}
              variant={"form-popover"}>
              <textarea className={"latex-textarea"} value={content} onChange={handleChange} />
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

const node = createStronglyTypedTiptapNode({
  name: "latex",
  inline: true,
  group: "inline",
  content: "inline*",
  editable: true,
  selectable: false,
  parseHTML() {
    return [
      {
        tag: "latex",
        priority: 200,
        node: "latex",
      },
    ];
  },

  renderHTML() {
    return ["latex"];
  },

  addNodeView: LaTexView(),
});

export const LaTex = createInternalBlockSpec(
  {
    content: "inline",
    type: "latex",
    propSchema: {
      language: {
        type: "string",
        default: "typescript",
      },
      storage: {
        type: "string",
        default: "",
      },
    },
  },
  {
    node,
    toExternalHTML: undefined as any,
    toInternalHTML: undefined as any,
  },
);
