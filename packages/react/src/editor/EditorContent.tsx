import { BlockNoteEditor } from "@blocknote/core";
import { ReactRenderer } from "@tiptap/react";
import { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";

const Portals: React.FC<{ renderers: Record<string, ReactRenderer> }> = ({
  renderers,
}) => {
  return (
    <>
      {Object.entries(renderers).map(([key, renderer]) => {
        return createPortal(renderer.reactElement, renderer.element, key);
      })}
    </>
  );
};

/**
 * Replacement of https://github.com/ueberdosis/tiptap/blob/6676c7e034a46117afdde560a1b25fe75411a21d/packages/react/src/EditorContent.tsx
 * that only takes care of the Portals.
 *
 * Original implementation is messy, and we use a "mount" system in BlockNoteTiptapEditor.tsx that makes this cleaner
 */
export function EditorContent(props: {
  editor: BlockNoteEditor<any, any, any>;
  children: any;
}) {
  const [renderers, setRenderers] = useState<Record<string, ReactRenderer>>({});
  const [singleRenderData, setSingleRenderData] = useState<any>();

  useEffect(() => {
    props.editor._tiptapEditor.contentComponent = {
      /**
       * Used by TipTap
       */
      setRenderer(id: string, renderer: ReactRenderer) {
        setRenderers((renderers) => ({ ...renderers, [id]: renderer }));
      },

      /**
       * Used by TipTap
       */
      removeRenderer(id: string) {
        setRenderers((renderers) => {
          const nextRenderers = { ...renderers };

          delete nextRenderers[id];

          return nextRenderers;
        });
      },

      /**
       * Render a single node to a container within the React context (used by BlockNote renderToDOMSpec)
       */
      renderToElement(node: React.ReactNode, container: HTMLElement) {
        flushSync(() => {
          setSingleRenderData({ node, container });
        });

        // clear after it's been rendered to `container`
        setSingleRenderData(undefined);
      },
    };
    // Without queueMicrotask, custom IC / styles will give a React FlushSync error
    queueMicrotask(() => {
      props.editor._tiptapEditor.createNodeViews();
    });
    return () => {
      props.editor._tiptapEditor.contentComponent = null;
    };
  }, [props.editor._tiptapEditor]);

  return (
    <>
      <Portals renderers={renderers} />
      {singleRenderData &&
        createPortal(singleRenderData.node, singleRenderData.container)}
      {props.children}
    </>
  );
}
