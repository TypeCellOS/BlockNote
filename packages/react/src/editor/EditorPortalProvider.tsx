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

const EditorPortalContext = createContext<HTMLElement | null>(null);

export function useEditorPortalElement(): HTMLElement | null {
  return useContext(EditorPortalContext);
}

// Registers a portal root on mount and deregisters it on unmount.
function useRegisterPortalRoot(root: HTMLElement | null) {
  const editor = useBlockNoteEditor();

  useEffect(() => {
    if (!root) {
      return;
    }

    editor.registerPortalRoot(root);
    return () => {
      editor.unregisterPortalRoot(root);
    };
  }, [editor, root]);
}

// Given a target element, checks whether a `.bn-root` element is somewhere up the DOM tree, as
// one is necessary to apply correct theming & styling. If one doesn't exist, creates one and
// returns it, both as a React node and HTML element. Otherwise, just returns the target element or
// null if the target is undefined.
function useThemedPortalRoot(target: HTMLElement | undefined): {
  root: HTMLElement | null;
  themingContainer: ReactNode;
} {
  const rootProps = useBlockNoteViewContext()?.portalRootProps;

  const [needsContainer, setNeedsContainer] = useState<{
    target: HTMLElement;
    value: boolean;
  }>();
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (target) {
      setNeedsContainer({ target, value: !target.closest(".bn-root") });
    }
  }, [target]);

  if (!target || needsContainer?.target !== target) {
    return { root: null, themingContainer: null };
  }

  if (!needsContainer.value) {
    return { root: target, themingContainer: null };
  }

  return {
    root: containerElement,
    themingContainer: createPortal(
      <div {...rootProps} ref={setContainerElement} />,
      target,
    ),
  };
}

// Exposes a target portal element for consumers of `EditorPortalContext` to consume. If the target
// element has no `.bn-root` element in its ancestors, so that styles & theming are properly
// applied to the element's descendants, one is created.
export function EditorPortalProvider(props: {
  target?: HTMLElement | null;
  children?: ReactNode;
}) {
  const { target, children } = props;

  const resolvedTarget =
    target === null
      ? typeof document !== "undefined"
        ? document.body
        : undefined
      : target;

  const { root, themingContainer } = useThemedPortalRoot(resolvedTarget);

  useRegisterPortalRoot(root);

  if (target === undefined) {
    return children;
  }

  return (
    <>
      <EditorPortalContext.Provider value={root}>
        {children}
      </EditorPortalContext.Provider>
      {themingContainer}
    </>
  );
}
