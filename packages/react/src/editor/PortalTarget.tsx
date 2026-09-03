import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";
import { useBlockNoteViewContext } from "./BlockNoteViewContext.js";

/**
 * The DOM node that the editor's floating UI (toolbars, menus, popovers, table
 * handles, etc.) portals into.
 *
 * Always holds a *resolved* root — themed, registered with the editor —
 * because {@link PortalTarget} is the only provider (the raw context is not
 * part of the public API): `BlockNoteView` provides the editor-wide default
 * (resolved from `editor.portalElement`), and controllers with a
 * `portalElement` prop or the mobile formatting toolbar override it for their
 * subtrees. Consumers can use the value without further checks.
 *
 * `null` means "no portal target (yet)" — during SSR and for the frame before
 * resolution; consumers should render nothing until it resolves.
 */
export const PortalContext = createContext<HTMLElement | null>(null);

export function usePortalContext(): HTMLElement | null {
  return useContext(PortalContext);
}

/**
 * Designates a portal target for BlockNote's floating UI, guaranteeing that
 * anything portalled to it lands inside a themed `.bn-root` and is recognized
 * as part of the editor. This is the only way a target enters the system:
 * `PortalContext` (read via `usePortalContext`) always holds a root that
 * passed through here, so consumers can use it without further checks.
 *
 * `target` semantics:
 * - `undefined` — no override; children render as-is and inherit the ambient
 *   portal target.
 * - `null` — explicit `document.body`.
 * - `HTMLElement` — used as-is.
 *
 * For a set target, children portal into it. If the target already sits
 * inside a `.bn-root` subtree (e.g. `editor.portalElement` in its default
 * position inside `bn-container`), it's used directly and theming comes from
 * the ancestor. Otherwise — for targets outside any themed subtree, e.g.
 * `document.body` — a `.bn-root` div is rendered inside it and used instead,
 * themed by the same `portalRootProps` descriptor as the editor container
 * (see `BlockNoteViewContext`), so both update in the same commit.
 *
 * The resolved root is provided via {@link PortalContext}, reported through
 * `onResolve` (for a parent that needs the value outside this subtree, like
 * `BlockNoteView` providing the editor-wide default), and registered with the
 * editor so `editor.isWithinEditor` counts the portalled UI as inside the
 * editor. Nothing renders for the frame(s) before the target is classified
 * and (when created) the root div is committed.
 */
export function PortalTarget(props: {
  target?: HTMLElement | null;
  children?: ReactNode;
  onResolve?: (resolved: HTMLElement | null) => void;
}) {
  const { target: targetProp, children, onResolve } = props;

  const editor = useBlockNoteEditor();
  const portalRootProps = useBlockNoteViewContext()?.portalRootProps;

  const target =
    targetProp === null
      ? typeof document !== "undefined"
        ? document.body
        : undefined
      : targetProp;

  // Whether `target` needs a themed `.bn-root` div, classified in an effect
  // rather than during render: on a first render the target may not be in the
  // DOM yet (`editor.portalElement` is appended to `bn-container` during the
  // mount commit), so `closest` would misclassify it. `null` = not yet
  // classified.
  const [needsRoot, setNeedsRoot] = useState<boolean | null>(null);
  useEffect(() => {
    if (!target) {
      setNeedsRoot(null);
      return;
    }
    setNeedsRoot(!target.closest(".bn-root"));
  }, [target]);

  const [root, setRoot] = useState<HTMLElement | null>(null);
  const resolved =
    !target || needsRoot === null ? null : needsRoot ? root : target;

  useEffect(() => {
    onResolve?.(resolved);
  }, [onResolve, resolved]);

  useEffect(() => {
    if (!resolved) {
      return;
    }
    return editor.registerPortalRoot(resolved);
  }, [editor, resolved]);

  if (targetProp === undefined) {
    return children;
  }

  if (!target || needsRoot === null) {
    return null;
  }

  return createPortal(
    needsRoot ? (
      <div {...portalRootProps} ref={setRoot}>
        <PortalContext.Provider value={root}>{children}</PortalContext.Provider>
      </div>
    ) : (
      <PortalContext.Provider value={target}>{children}</PortalContext.Provider>
    ),
    target,
  );
}
