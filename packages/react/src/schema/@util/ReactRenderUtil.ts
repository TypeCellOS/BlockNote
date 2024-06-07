import { BlockNoteEditor } from "@blocknote/core";
import { flushSync } from "react-dom";
import { Root, createRoot } from "react-dom/client";

export function renderToDOMSpec(
  fc: (refCB: (ref: HTMLElement | null) => void) => React.ReactNode,
  editor: BlockNoteEditor<any, any, any> | undefined
) {
  let contentDOM: HTMLElement | undefined;
  const div = document.createElement("div");

  let root: Root | undefined;
  const { _tiptapEditor } = editor || {};

  if (_tiptapEditor?.contentComponent) {
    // Render temporarily using `EditorContent` (which is stored somewhat hacky on `_tiptapEditor.contentComponent`)
    // This way React Context will still work, as `fc` will be rendered inside the existing React tree
    _tiptapEditor.contentComponent.renderToElement(
      fc((el) => (contentDOM = el || undefined)),
      div
    );
  } else {
    // If no editor is provided, or if _tiptapEditor or _tiptapEditor.contentComponent is undefined, use a temporary root.
    // This is currently only used for Styles. In this case, react context etc. won't be available inside `fc`
    root = createRoot(div);
    flushSync(() => {
      root!.render(fc((el) => (contentDOM = el || undefined)));
    });
  }

  if (!div.childElementCount) {
    // TODO
    // eslint-disable-next-line no-console
    console.warn("ReactInlineContentSpec: renderHTML() failed");
    return {
      dom: document.createElement("span"),
    };
  }

  // clone so we can unmount the react root
  contentDOM?.setAttribute("data-tmp-find", "true");
  const cloneRoot = div.cloneNode(true) as HTMLElement;
  const dom = cloneRoot.firstElementChild! as HTMLElement;
  const contentDOMClone = cloneRoot.querySelector(
    "[data-tmp-find]"
  ) as HTMLElement | null;
  contentDOMClone?.removeAttribute("data-tmp-find");

  root?.unmount();

  return {
    dom,
    contentDOM: contentDOMClone || undefined,
  };
}
