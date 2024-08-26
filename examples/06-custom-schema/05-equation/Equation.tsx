import { InlineContentFromConfig } from "@blocknote/core";
import {
  createReactInlineContentSpec,
  useBlockNoteEditor,
  useComponentsContext,
} from "@blocknote/react";
import { Node as TipTapNode } from "@tiptap/pm/model";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  TextareaHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AiOutlineEnter } from "react-icons/ai";
import "./styles.css";

const TextareaView = forwardRef<
  HTMLTextAreaElement,
  {
    autofocus?: boolean;
  } & TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => {
  const { autofocus, ...rest } = props;
  useEffect(() => {
    if (autofocus && ref && typeof ref !== "function" && ref.current) {
      ref.current.setSelectionRange(0, ref.current.value.length);
      ref.current.focus();
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
  );
});

export const InlineEquationView = (props: {
  inlineContent: InlineContentFromConfig<typeof InlineEquation.config, any>;
  node: TipTapNode;
  isSelected: boolean;
}) => {
  const content = props.inlineContent.props.content;
  const nodeSize = props.node.nodeSize;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const html = useMemo(
    () =>
      katex.renderToString(content, {
        throwOnError: false,
      }),
    [content]
  );

  const getTextareaEdge = () => {
    const $textarea = textareaRef.current;
    if (!$textarea) {
      return {};
    }

    return {
      isLeftEdge:
        $textarea.selectionStart === 0 && $textarea.selectionEnd === 0,
      isRightEdge:
        $textarea.selectionStart === $textarea.value.length &&
        $textarea.selectionEnd === $textarea.value.length,
    };
  };

  const getPos = useCallback((): number => {
    let position = 0;

    editor._tiptapEditor.state.doc.descendants(
      (node: TipTapNode, pos: number) => {
        if (node === props.node) {
          position = pos;
          return false;
        }
      }
    );

    return position;
  }, [editor, props.node]);

  const handleEnter = useCallback(
    (event: ReactMouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      const pos = getPos();
      if (!content) {
        // TODO: implement BlockNote API to easily delete inline content
        const node = props.node;
        const view = editor._tiptapEditor.view;

        const tr = view.state.tr.delete(pos, pos + node.nodeSize);

        view.dispatch(tr);
        editor._tiptapEditor.commands.setTextSelection(pos);
      } else {
        // TODO: implement BlockNote API to easily update cursor position
        editor._tiptapEditor.commands.setTextSelection(pos + nodeSize);
      }
      editor.focus();
    },
    [content, editor, getPos, nodeSize, props.node]
  );

  const handleMenuNavigationKeys = useCallback(
    (event: React.KeyboardEvent) => {
      const textareaEdge = getTextareaEdge();
      const pos = getPos();

      if (event.key === "ArrowLeft") {
        if (textareaEdge.isLeftEdge) {
          // TODO: implement BlockNote API to set cursor position
          event.preventDefault();
          editor.focus();
          editor._tiptapEditor.commands.setTextSelection(pos);
        }
        return true;
      }

      if (event.key === "ArrowRight") {
        if (textareaEdge.isRightEdge) {
          // TODO: implement BlockNote API to set cursor position
          event.preventDefault();
          editor.focus();
          editor._tiptapEditor.commands.setTextSelection(pos + nodeSize);
        }
        return true;
      }

      if (event.key === "Enter" && props.isSelected) {
        handleEnter(event);
        return true;
      }

      return false;
    },
    [editor, getPos, handleEnter, nodeSize, props.isSelected]
  );

  // TODO: implement BlockNote API to easily update inline content
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = getPos();
    const node = props.node;
    const view = editor._tiptapEditor.view;

    const tr = view.state.tr.replaceWith(
      pos,
      pos + node.nodeSize,
      view.state.schema.nodes.inlineEquation.create(
        {
          ...node.attrs,
          content: val || "",
        },
        null
      )
    );

    view.dispatch(tr);
  };

  return (
    <NodeViewWrapper as={"span"} ref={containerRef}>
      <Components.Generic.Popover.Root opened={props.isSelected}>
        <Components.Generic.Popover.Trigger>
          <span
            className={"equation " + (props.isSelected ? "focus" : "")}
            ref={contentRef}>
            {!content ? (
              <span className={"equation-empty"}>New Equation</span>
            ) : (
              <span
                className={"equation-content"}
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
              onKeyDown={handleMenuNavigationKeys}
            />
            <span onClick={handleEnter} className={"equation-enter"}>
              <AiOutlineEnter />
            </span>
          </label>
        </Components.Generic.Popover.Content>
      </Components.Generic.Popover.Root>
    </NodeViewWrapper>
  );
};

export const InlineEquation = createReactInlineContentSpec(
  {
    type: "inlineEquation",
    propSchema: {
      content: {
        default: "",
      },
    },
    content: "none",
    // copy content
    renderHTML: (props) => {
      const { HTMLAttributes, node } = props;
      const dom = document.createElement("span");
      dom.setAttribute("data-inline-content-type", "inlineEquation");
      Object.keys(HTMLAttributes).forEach((key) => {
        dom.setAttribute(key, HTMLAttributes[key]);
      });
      dom.innerText = node.attrs.content;

      return { dom };
    },
  },
  {
    render: (props) => {
      return (
        <InlineEquationView
          node={props.node}
          inlineContent={props.inlineContent}
          isSelected={props.isSelected}
        />
      );
    },
  }
);
