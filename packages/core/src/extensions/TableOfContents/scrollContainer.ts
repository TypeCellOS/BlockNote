export type ScrollContainer = {
  /** The element whose `scrollTop` moves the editor. */
  element: Element;
  /** Where the container's `scroll` events arrive. */
  eventTarget: Element | Window;
  /** The viewport `y` of the top of the area the container shows. */
  getVisibleTop: () => number;
};

/**
 * The nearest element, from `element` itself up, whose overflow scrolls,
 * else the page. Like the browser does for scrolling, it ignores whether
 * that element overflows right now.
 */
export function findScrollContainer(element: Element): Element {
  const { body, documentElement, defaultView } = element.ownerDocument;
  for (
    let current: Element | null = element;
    current && current !== body && current !== documentElement;
    current = current.parentElement
  ) {
    const { overflowY } = defaultView!.getComputedStyle(current);
    if (overflowY === "auto" || overflowY === "scroll") {
      return current;
    }
  }
  return documentElement;
}

export function getScrollContainer(element: Element): ScrollContainer {
  const doc = element.ownerDocument;
  if (element === doc.documentElement || element === doc.body) {
    // The page scrolls its scrolling element, and its scroll events arrive at
    // the document, from where they bubble to the window.
    return {
      element: doc.scrollingElement ?? doc.documentElement,
      eventTarget: doc.defaultView!,
      getVisibleTop: () => 0,
    };
  }
  return {
    element,
    eventTarget: element,
    getVisibleTop: () =>
      element.getBoundingClientRect().top + element.clientTop,
  };
}
