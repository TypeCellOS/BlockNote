import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../hooks/useEditorDomElement.js";
import { useBlockNoteViewContext } from "./BlockNoteViewContext.js";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Set by `PortalElementOverride` (a root to escape to) and by
// `PortalElementAnchor` (a UI element's own wrapper); the default comes from
// the editor itself, see `usePortalElement`.
const PortalElementContext = createContext<HTMLElement | null>(null);

/**
 * The element the floating UI below should portal into: the nearest
 * {@link PortalElementAnchor} (the wrapper of the toolbar, side menu, … that
 * opens it), else the nearest {@link PortalElementOverride}'s element, else by
 * default the editor's own container. All of these sit inside a themed
 * `.bn-root`, so portalled UI keeps the editor's styling and color scheme
 * wherever in the DOM it lands.
 *
 * `null` until the editor has mounted, and on the server. Consumers render
 * nothing until it exists.
 */
export function usePortalElement(): HTMLElement | null {
  const override = useContext(PortalElementContext);
  const editorDOMElement = useEditorDOMElement();

  if (override) {
    return override;
  }

  return editorDOMElement?.closest<HTMLElement>(".bn-container") ?? null;
}

/**
 * Redirects the floating UI below it into `target`, for UI that must escape
 * the editor container — an ancestor's `overflow` clipping it, or a stacking
 * context painting it behind the page (see
 * `MobileFormattingToolbarController`).
 *
 * The portal element is a themed `.bn-root` mounted inside `target`, so
 * portalled UI stays styled wherever it goes. It is created up front rather
 * than rendered, so consumers have it on their first render, and mounted in a
 * layout effect, so it is in the DOM before paint. It is also registered with
 * the editor, so focus inside it still counts as focus within the editor.
 *
 * - `undefined` — no redirect; the ambient portal element stays in effect.
 * - `null` — `document.body`, escaping every ancestor.
 */
export function PortalElementOverride(props: {
  target?: HTMLElement;
  children?: ReactNode;
}) {
  const { target, children } = props;

  const editor = useBlockNoteEditor();
  const applyThemedRoot = useBlockNoteViewContext()?.applyThemedRoot;

  const [portalElement] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useIsomorphicLayoutEffect(() => {
    if (!portalElement || !target) {
      return;
    }

    target.appendChild(portalElement);
    return () => portalElement.remove();
  }, [portalElement, target]);

  // React does not render this element, so the same theming the editor
  // container gets from its props is applied here by hand.
  useIsomorphicLayoutEffect(() => {
    if (!portalElement || !target) {
      return;
    }

    applyThemedRoot?.(portalElement);
  }, [portalElement, target, applyThemedRoot]);

  // Floating UI portalled out of the editor's DOM tree is still the editor's
  // UI: registering the element keeps `editor.isWithinEditor` (and the focus
  // tracking built on it) true for what renders inside.
  useEffect(() => {
    if (!portalElement || !target) {
      return;
    }

    editor.registerPortalElement(portalElement);
    return () => editor.unregisterPortalElement(portalElement);
  }, [editor, portalElement, target]);

  if (target === undefined) {
    return children;
  }

  return (
    <PortalElementContext.Provider value={portalElement}>
      {children}
    </PortalElementContext.Provider>
  );
}

/**
 * An anchor for the floating UI a UI element opens (its menus, popovers and
 * forms): a zero-size, absolutely positioned element next to that UI element,
 * inside the wrapper that positions it. What portals into it stays a DOM
 * descendant of that wrapper, so it shares the wrapper's stacking context and
 * visibility (it hides when the UI element hides) while taking no part in its
 * layout.
 *
 * The anchor exists from the first render (created up front and attached to
 * the rendered holder on commit, before any effect runs), so consumers never
 * see a `null` and nothing re-renders to pick it up. The holder is rendered
 * by React so that it, and with it the anchor, is re-attached whenever the
 * wrapper's content is re-rendered.
 */
function usePortalElementAnchor(): {
  anchor: HTMLElement | null;
  holder: ReactNode;
} {
  const [anchor] = useState(() => {
    if (typeof document === "undefined") {
      return null;
    }
    const element = document.createElement("span");
    element.className = "bn-portal-anchor";
    return element;
  });

  const holderRef = useCallback(
    (holder: HTMLElement | null) => {
      if (holder && anchor && anchor.parentElement !== holder) {
        holder.appendChild(anchor);
      }
    },
    [anchor],
  );

  const holder = (
    <span
      ref={holderRef}
      className={PORTAL_ELEMENT_ANCHOR_HOLDER_CLASS}
      style={{ position: "absolute", width: 0, height: 0, overflow: "visible" }}
    />
  );

  return { anchor, holder };
}

const PORTAL_ELEMENT_ANCHOR_HOLDER_CLASS = "bn-portal-anchor-holder";

/**
 * Whether `element` has rendered children other than a
 * {@link PortalElementAnchor}'s holder. The holder means a wrapper that renders
 * an anchor is never empty, so "the UI element rendered nothing" has to be
 * checked with this instead of the wrapper's `innerHTML`.
 */
export function hasChildrenBesidesPortalElementAnchor(
  element: HTMLElement,
): boolean {
  return Array.from(element.childNodes).some(
    (node) =>
      !(
        node instanceof Element &&
        node.classList.contains(PORTAL_ELEMENT_ANCHOR_HOLDER_CLASS)
      ),
  );
}

/**
 * Renders a portal anchor inside a UI element's wrapper and makes it the
 * portal element for everything below (see {@link usePortalElementAnchor}): the
 * menus and popovers a toolbar, side menu or table handle opens render inside
 * the wrapper that positions and hides that UI element. Nested menus resolve
 * to the same anchor, never to their parent dropdown, which may clip.
 *
 * The anchor is a sibling of the UI element, not a descendant, so it is never
 * inside a scrolling part of it (iOS WebKit clips positioned descendants of
 * scroll containers); and a `portalElements` override that relocates the
 * wrapper takes the anchor, and so the popups, along with it.
 *
 * Pass a function as `children` to receive the portal element for props that
 * need it explicitly.
 */
export function PortalElementAnchor(props: {
  children?: ReactNode | ((portalElement: HTMLElement | null) => ReactNode);
}) {
  const { anchor, holder } = usePortalElementAnchor();
  const ambient = usePortalElement();
  const portalElement = anchor ?? ambient;

  const children =
    typeof props.children === "function"
      ? props.children(portalElement)
      : props.children;

  return (
    <>
      {holder}
      <PortalElementContext.Provider value={portalElement}>
        {children}
      </PortalElementContext.Provider>
    </>
  );
}
