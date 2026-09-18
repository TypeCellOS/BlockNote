import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useState,
} from "react";

import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../hooks/useEditorDomElement.js";
import { useBlockNoteViewContext } from "./BlockNoteViewContext.js";

// Runs in the commit's mutation phase, before any layout effect in the tree.
const useIsomorphicInsertionEffect =
  typeof window !== "undefined" ? useInsertionEffect : useEffect;

// Set by `PortalElementOverride` (a root to escape to) and by
// `PortalElementAnchor` (a UI element's own wrapper); the default comes from
// the editor itself, see `usePortalElement`.
const PortalElementContext = createContext<HTMLElement | null>(null);

/**
 * The element the floating UI below should portal into: the nearest
 * {@link PortalElementAnchor} (the wrapper of the toolbar, side menu, … that
 * opens it), else the nearest {@link PortalElementOverride}'s element, else by
 * default the element wrapping the editor element. In the default layout that
 * is the editor's `bn-container`; with `renderEditor={false}` it is whatever
 * `BlockNoteViewEditor` was rendered into, so the floating UI clips and scrolls
 * with the editor rather than escaping into the layout around it. All of these
 * sit inside a themed `.bn-root`, so portalled UI keeps the editor's styling
 * and color scheme wherever in the DOM it lands.
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

  return editorDOMElement?.parentElement ?? null;
}

/**
 * Resets the portal element for the subtree to the editor's own default (see
 * {@link usePortalElement}). `BlockNoteViewContainer` wraps its content in it:
 * a `BlockNoteView` nested inside another view's floating UI (the comments
 * composer, an editor in a custom block's popover) would otherwise inherit the
 * outer view's anchor or override, an element registered with the outer
 * editor, so the nested editor's own menus and popovers would count as
 * outside it for `isWithinEditor` and the focus tracking built on it.
 */
export function PortalElementReset(props: { children?: ReactNode }) {
  return (
    <PortalElementContext.Provider value={null}>
      {props.children}
    </PortalElementContext.Provider>
  );
}

/**
 * Redirects the floating UI below it into `target`, for UI that must escape
 * the editor container — an ancestor's `overflow` clipping it, or a stacking
 * context painting it behind the page (see
 * `MobileFormattingToolbarController`).
 *
 * The portal element is a themed `.bn-root` mounted inside `target`, so
 * portalled UI stays styled wherever it goes. It is created up front rather
 * than rendered, so consumers have it on their first render, and attached in
 * an insertion effect, so it is in the document before any layout effect of
 * the children runs: a UI library that portals eagerly (Ariakit renders its
 * popovers hidden from the start) picks its mount point in a layout effect,
 * and given a still-detached element it re-parents it to `document.body`,
 * outside the editor's registered UI. It is also registered with the editor,
 * so focus inside it still counts as focus within the editor.
 *
 * `undefined` means no redirect: the ambient portal element stays in effect.
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

  // An insertion effect, not a layout effect: a parent's layout effect runs
  // after its children's, and Ariakit picks the mount point of its eagerly
  // rendered popovers in a layout effect, re-parenting a still-detached
  // element to `document.body`, outside the editor's registered UI.
  // How-to-test: as a layout effect, Ariakit re-parents the mobile toolbar's anchor to document.body, so focus in the link form counts as outside the editor and the toolbar unmounts (covered by portalElements: "has an override root in the document before its children's layout effects run", and skinFocus, android, ariakit: "the link button hands focus to the URL input").
  useIsomorphicInsertionEffect(() => {
    if (!portalElement || !target) {
      return;
    }

    target.appendChild(portalElement);
    return () => portalElement.remove();
  }, [portalElement, target]);

  // React does not render this element, so the same theming the editor
  // container gets from its props is applied here by hand. Same phase as the
  // attach above, so children measure themed styles from their first layout
  // effect on.
  useIsomorphicInsertionEffect(() => {
    if (!portalElement || !target) {
      return;
    }

    applyThemedRoot?.(portalElement);
  }, [portalElement, target, applyThemedRoot]);

  // Floating UI portalled out of the editor's DOM tree is still the editor's
  // UI: registering the element keeps `editor.isWithinEditor` (and the focus
  // tracking built on it) true for what renders inside. Registered in the
  // same phase too, so nothing a child focuses from its own effects is ever
  // judged before the root counts as editor UI.
  useIsomorphicInsertionEffect(() => {
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
