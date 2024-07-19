import { useComponentsContext,useEditorContentOrSelectionChange } from "@blocknote/react";
import { NodeView } from "prosemirror-view";
import { BlockNoteEditor } from "@blocknote/core";
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
import {ChangeEvent, useEffect, useState, useRef, useCallback, forwardRef, MouseEvent as ReactMouseEvent} from "react";
import katex from "katex";
import { AiOutlineEnter } from "react-icons/ai";
import "katex/dist/katex.min.css";
import "./styles.css";


const TextareaView = forwardRef((props: any, ref: any) => {
  const { autofocus, ...rest } = props;
  useEffect(() => {
    if (autofocus && ref.current) {
      ref.current.setSelectionRange(0, ref.current.value.length);
      ref.current.focus()
    }
  }, [autofocus, ref]);

  return (
      <textarea
          ref={ref}
          className={"equation-textarea"}
          value={props.value}
          onChange={props.onChange}
          {...rest}
      />
  )
});

function InlineEquationView() {
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
      const nodeSize = props.node.nodeSize;
      const textareaRef = useRef<HTMLTextAreaElement | null>(null);
      const contentRef = useRef<HTMLElement | null>(null);
      const containerRef = useRef<HTMLElement | null>(null);
      const [html, setHtml] = useState("");
      const [focus, setFocus] = useState(!content);
      const [curEdge, setCurEdge] = useState(!content);
      const Components = useComponentsContext()!;

      const getTextareaEdge = () => {
        const $textarea = textareaRef.current;
        if (!$textarea) {
          return {};
        }

        return {
          isLeftEdge: $textarea.selectionStart === 0 && $textarea.selectionEnd === 0,
          isRightEdge: $textarea.selectionStart === $textarea.value.length && $textarea.selectionEnd === $textarea.value.length,
        }
      }

      useEffect(() => {
        const html = katex.renderToString(content, {
          throwOnError: false,
        });
        setHtml(html);
      }, [content]);

      useEditorContentOrSelectionChange(() => {
        const pos = props.getPos?.();
        const courPos = editor._tiptapEditor.state.selection.from;
        const selection = editor.getSelection();

        setCurEdge(!selection && (courPos === pos + nodeSize || courPos === pos));
      })


      useEffect(() => {
        if (focus) {
          contentRef.current?.click();
        }
      }, [focus]);

      const handleEnter = useCallback((event: ReactMouseEvent | KeyboardEvent) => {
        const pos = props.getPos?.();
        event.preventDefault();
        if (!content) {
          const node = props.node;
          const view = editor._tiptapEditor.view;

          const tr = view.state.tr.delete(
              pos,
              pos + node.nodeSize
          );

          view.dispatch(tr);
          editor._tiptapEditor.commands.setTextSelection(pos);
        } else {
          editor._tiptapEditor.commands.setTextSelection(pos + nodeSize);
        }
        editor.focus();
        setFocus(false);
        setCurEdge(true);
      }, [content, editor, nodeSize, props]);

      const handleMenuNavigationKeys = useCallback((event: KeyboardEvent) => {
        const textareaEdge = getTextareaEdge();
        const pos = props.getPos?.();
        const courPos = editor._tiptapEditor.state.selection.from;

        if (event.key === "ArrowLeft") {
          if (courPos === pos + nodeSize && !focus) {
            setFocus(true);
          }
          if (textareaEdge.isLeftEdge) {
            event.preventDefault();
            editor.focus();
            editor._tiptapEditor.commands.setTextSelection(pos);
            setFocus(false);
          }
          return true;
        }

        if (event.key === "ArrowRight") {
          if (courPos === pos && !focus) {
            setFocus(true);
          }
          if (textareaEdge.isRightEdge) {
            event.preventDefault();
            editor.focus();
            editor._tiptapEditor.commands.setTextSelection(pos + nodeSize);
            setFocus(false)
          }
          return true;
        }

        if (event.key === "Enter" && focus) {
          handleEnter(event);
          return true;
        }

        return false;
      }, [editor, focus, handleEnter, nodeSize, props]);

      useEffect(() => {
        if (focus || curEdge) {
          editor.domElement.addEventListener(
              "keydown",
              handleMenuNavigationKeys,
              true
          );
        }

        return () => {
          editor.domElement.removeEventListener(
              "keydown",
              handleMenuNavigationKeys,
              true
          );
        };
      }, [editor.domElement, focus, handleMenuNavigationKeys, curEdge]);

      const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = props.getPos?.();
        const node = props.node;
        const view = editor._tiptapEditor.view;

        const tr = view.state.tr.replaceWith(
          pos,
          pos + node.nodeSize,
          view.state.schema.nodes.inlineEquation.create(
            {
              ...node.attrs,
            },
            val ? view.state.schema.text(val) : null
          )
        );

        view.dispatch(tr);
        setFocus(true);
      };

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setFocus(false);
          }
        };

        document.addEventListener('pointerup', handleClickOutside, true);
        return () => {
          document.removeEventListener('pointerup', handleClickOutside, true);
        };
      }, []);

      return (
        <NodeViewWrapper as={"span"} ref={containerRef}>
          <Components.Generic.Popover.Root opened={focus}>
            <Components.Generic.Popover.Trigger>
              <span className={"equation " + (focus ? 'focus' : '')} ref={contentRef}>
                {!content ? (
                  <span onClick={() => setFocus(true)} className={"equation-empty"}>
                    New Equation
                  </span>
                ) : (
                  <span
                    onClick={() => setFocus(true)} className={"equation-content"}
                    dangerouslySetInnerHTML={{ __html: html }}></span>
                )}
              </span>
            </Components.Generic.Popover.Trigger>
            <Components.Generic.Popover.Content
                className={"bn-popover-content bn-form-popover"}
                variant={"form-popover"}>
              <label className={"equation-label"}>
                <TextareaView
                    placeholder={"c^2 = a^2 + b^2"}
                    ref={textareaRef}
                    autofocus
                    value={content}
                    onChange={handleChange}
                />
                <span onClick={handleEnter} className={"equation-enter"}><AiOutlineEnter /></span>
              </label>
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
  name: "inlineEquation",
  inline: true,
  group: "inline",
  content: "inline*",
  editable: true,
  selectable: false,
  parseHTML() {
    return [
      {
        tag: "inlineEquation",
        priority: 200,
        node: "inlineEquation",
      },
    ];
  },

  // @ts-ignore
  renderHTML({ HTMLAttributes }) {
    return [
      "inlineEquation",
      mergeAttributes(HTMLAttributes, {
        "data-content-type": this.name,
      }),
      0,
    ];
  },

  addNodeView: InlineEquationView(),
});

export const InlineEquation = createInternalInlineContentSpec(
  {
    content: "styled",
    type: "inlineEquation",
    propSchema: {},
  },
  {
    node,
  }
);
