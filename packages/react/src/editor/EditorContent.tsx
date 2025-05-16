import { ReactRenderer } from "@tiptap/react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// this file takes the methods we need from
// https://github.com/ueberdosis/tiptap/blob/develop/packages/react/src/EditorContent.tsx

export function getContentComponent() {
  const subscribers = new Set<() => void>();
  let renderers: Record<string, React.ReactPortal> = {};

  return {
    /**
     * Subscribe to the editor instance's changes.
     */
    subscribe(callback: () => void) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getSnapshot() {
      return renderers;
    },
    getServerSnapshot() {
      return renderers;
    },
    /**
     * Adds a new NodeView Renderer to the editor.
     */
    setRenderer(id: string, renderer: ReactRenderer) {
      renderers = {
        ...renderers,
        [id]: createPortal(renderer.reactElement, renderer.element, id),
      };

      subscribers.forEach((subscriber) => subscriber());
    },
    /**
     * Removes a NodeView Renderer from the editor.
     */
    removeRenderer(id: string) {
      const nextRenderers = { ...renderers };

      delete nextRenderers[id];
      renderers = nextRenderers;
      subscribers.forEach((subscriber) => subscriber());
    },
  };
}

type ContentComponent = ReturnType<typeof getContentComponent>;

/**
 * This component renders all of the editor's node views.
 */
export const Portals: React.FC<{ contentComponent: ContentComponent }> = ({
  contentComponent,
}) => {
  // For performance reasons, we render the node view portals on state changes only
  const renderers = useSyncExternalStore(
    contentComponent.subscribe,
    contentComponent.getSnapshot,
    contentComponent.getServerSnapshot,
  );

  // This allows us to directly render the portals without any additional wrapper
  return <>{Object.values(renderers)}</>;
};
