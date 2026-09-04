import {
  createContext,
  ReactNode,
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

// Set only by `PortalElementOverride`; the default comes from the editor
// itself, see `usePortalElement`.
const PortalElementContext = createContext<HTMLElement | null>(null);

/**
 * The element the editor's floating UI (toolbars, menus, popovers) should
 * portal into: the nearest {@link PortalElementOverride}'s element, or by
 * default the editor's own container. Either way it is a themed `.bn-root`,
 * so portalled UI keeps the editor's styling and color scheme wherever in the
 * DOM it lands.
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
  target?: HTMLElement | null;
  children?: ReactNode;
}) {
  const { target, children } = props;

  const editor = useBlockNoteEditor();
  const applyThemedRoot = useBlockNoteViewContext()?.applyThemedRoot;

  const [portalElement] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  const resolvedTarget =
    target === null
      ? typeof document === "undefined"
        ? undefined
        : document.body
      : target;

  useIsomorphicLayoutEffect(() => {
    if (!portalElement || !resolvedTarget) {
      return;
    }

    resolvedTarget.appendChild(portalElement);
    return () => portalElement.remove();
  }, [portalElement, resolvedTarget]);

  // React does not render this element, so the same theming the editor
  // container gets from its props is applied here by hand.
  useIsomorphicLayoutEffect(() => {
    if (!portalElement || !resolvedTarget) {
      return;
    }

    applyThemedRoot?.(portalElement);
  }, [portalElement, resolvedTarget, applyThemedRoot]);

  // Floating UI portalled out of the editor's DOM tree is still the editor's
  // UI: registering the element keeps `editor.isWithinEditor` (and the focus
  // tracking built on it) true for what renders inside.
  useEffect(() => {
    if (!portalElement || !resolvedTarget) {
      return;
    }

    editor.registerPortalElement(portalElement);
    return () => editor.unregisterPortalElement(portalElement);
  }, [editor, portalElement, resolvedTarget]);

  if (target === undefined) {
    return children;
  }

  return (
    <PortalElementContext.Provider value={portalElement}>
      {children}
    </PortalElementContext.Provider>
  );
}
