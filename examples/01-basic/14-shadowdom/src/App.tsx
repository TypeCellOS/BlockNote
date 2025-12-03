import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import interCss from "@blocknote/core/fonts/inter.css?inline";
import mantineCss from "@blocknote/mantine/style.css?inline";

function ShadowWrapper(props: { children: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (host.current && !shadowRoot) {
      const root = host.current.shadowRoot || host.current.attachShadow({ mode: "open" });
      setShadowRoot(root);
    }
  }, [shadowRoot]);

  return (
    <div ref={host}>
      {shadowRoot &&
        createPortal(
          <>
            <style>{interCss}</style>
            <style>{mantineCss}</style>
            {props.children}
          </>,
          shadowRoot as any
        )}
    </div>
  );
}

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance using a React component.
  return (
    <ShadowWrapper>
      <BlockNoteView editor={editor} />
    </ShadowWrapper>
  );
}
