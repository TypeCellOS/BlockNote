import {
  createReactInlineContentSpec,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorContentOrSelectionChange,
} from "@blocknote/react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  ChangeEvent,
  forwardRef,
  MouseEvent as ReactMouseEvent,
  TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import katex from "katex";
import { AiOutlineEnter } from "react-icons/ai";
import "katex/dist/katex.min.css";
import "./styles.css";
import { Node as TipTapNode } from "@tiptap/pm/model";

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

export const InlineEquationView = (props: { node: TipTapNode }) => {
  const content = props.node.attrs.content;
  const nodeSize = props.node.nodeSize;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const [focus, setFocus] = useState(!content);
  const [curEdge, setCurEdge] = useState(!content);
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

  useEditorContentOrSelectionChange(() => {
    const pos = getPos();
    const courPos = editor._tiptapEditor.state.selection.from;
    const selection = editor.getSelection();

    setCurEdge(!selection && (courPos === pos + nodeSize || courPos === pos));
  });

  useEffect(() => {
    if (focus) {
      contentRef.current?.click();
    }
  }, [focus]);

  const handleEnter = useCallback(
    (event: ReactMouseEvent | KeyboardEvent) => {
      event.preventDefault();
      const pos = getPos();
      if (!content) {
        const node = props.node;
        const view = editor._tiptapEditor.view;

        const tr = view.state.tr.delete(pos, pos + node.nodeSize);

        view.dispatch(tr);
        editor._tiptapEditor.commands.setTextSelection(pos);
      } else {
        editor._tiptapEditor.commands.setTextSelection(pos + nodeSize);
      }
      editor.focus();
      setFocus(false);
      setCurEdge(true);
    },
    [content, editor, getPos, nodeSize, props.node]
  );

  const handleMenuNavigationKeys = useCallback(
    (event: KeyboardEvent) => {
      const textareaEdge = getTextareaEdge();
      const pos = getPos();
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
          setFocus(false);
        }
        return true;
      }

      if (event.key === "Enter" && focus) {
        handleEnter(event);
        return true;
      }

      return false;
    },
    [editor, focus, getPos, handleEnter, nodeSize]
  );

  useEffect(() => {
    const domEle = editor._tiptapEditor?.view?.dom;
    if (focus || curEdge) {
      domEle?.addEventListener("keydown", handleMenuNavigationKeys, true);
    }

    return () => {
      domEle?.removeEventListener("keydown", handleMenuNavigationKeys, true);
    };
  }, [editor, focus, handleMenuNavigationKeys, curEdge]);

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
    setFocus(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFocus(false);
      }
    };

    document.addEventListener("pointerup", handleClickOutside, true);
    return () => {
      document.removeEventListener("pointerup", handleClickOutside, true);
    };
  }, []);

  return (
    <NodeViewWrapper as={"span"} ref={containerRef}>
      <Components.Generic.Popover.Root opened={focus}>
        <Components.Generic.Popover.Trigger>
          <span
            className={"equation " + (focus ? "focus" : "")}
            ref={contentRef}>
            {!content ? (
              <span onClick={() => setFocus(true)} className={"equation-empty"}>
                New Equation
              </span>
            ) : (
              <span
                onClick={() => setFocus(true)}
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
      return <InlineEquationView node={props.node} />;
    },
  }
);
