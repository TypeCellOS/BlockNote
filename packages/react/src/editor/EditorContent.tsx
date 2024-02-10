import { BlockNoteEditor } from "@blocknote/core";
import { ReactRenderer } from "@tiptap/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

export function EditorContent(props: {
  editor: BlockNoteEditor<any, any, any>;
  children: any;
}) {
  const [renderers, setRenderers] = useState<Record<string, ReactRenderer>>({});

  useEffect(() => {
    props.editor._tiptapEditor.contentComponent = {
      setRenderer(id: string, renderer: ReactRenderer) {
        setRenderers((renderers) => ({ ...renderers, [id]: renderer }));
      },

      removeRenderer(id: string) {
        setRenderers((renderers) => {
          const nextRenderers = { ...renderers };

          delete nextRenderers[id];

          return nextRenderers;
        });
      },
    };
    return () => {
      props.editor._tiptapEditor.contentComponent = null;
    };
  }, [props.editor._tiptapEditor]);

  return (
    <>
      <Portals renderers={renderers} />
      {props.children}
    </>
  );
}
