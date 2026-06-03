import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote, type PortalElementsMap } from "@blocknote/react";

import "./styles.css";

const initialContent = [
  {
    type: "paragraph" as const,
    content: "Click in this editor and press / to open the slash menu.",
  },
  {
    type: "paragraph" as const,
    content: "Notice whether the menu fits inside the box or escapes it.",
  },
  {
    type: "paragraph" as const,
  },
];

function PortalDemoEditor({
  label,
  description,
  portalElements,
}: {
  label: string;
  description: string;
  portalElements?: PortalElementsMap;
}) {
  const editor = useCreateBlockNote({ initialContent });
  return (
    <div className="view-wrapper">
      <div className="view-label">{label}</div>
      <div className="view-description">{description}</div>
      <div className="view">
        <BlockNoteView editor={editor} portalElements={portalElements} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="views">
      <PortalDemoEditor
        label="Default — clipped"
        description="No portalElements prop. Floating UI mounts inside .bn-container — the slash menu is clipped by the editor's bounds."
      />
      <PortalDemoEditor
        label="portalElements={{ default: document.body }} — escapes"
        description="Every floating UI element escapes the editor container and renders directly under <body>."
        portalElements={{ default: document.body }}
      />
    </div>
  );
}
