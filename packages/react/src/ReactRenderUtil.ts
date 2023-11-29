import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

export function renderToDOMSpec(
  fc: (refCB: (ref: HTMLElement | null) => void) => React.ReactNode
) {
  let contentDOM: HTMLElement | undefined;
  const div = document.createElement("div");
  const root = createRoot(div);
  flushSync(() => {
    root.render(fc((el) => (contentDOM = el || undefined)));
  });

  if (!div.childElementCount) {
    // TODO
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

  root.unmount();

  return {
    dom,
    contentDOM: contentDOMClone || undefined,
  };
}
