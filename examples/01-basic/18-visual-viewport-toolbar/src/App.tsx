import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Distance in pixels from the bottom of the layout viewport to the top of the
  // virtual keyboard. Used to position the dummy toolbar just above it.
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const updatePosition = () => {
      // `offsetTop + height` is the distance from the top of the layout viewport
      // to the bottom of the visual viewport, which sits at the top of the
      // virtual keyboard. We convert it to a `bottom` offset (measured from the
      // bottom of the layout viewport) since the toolbar is `position: fixed`.
      //
      // NOTE (Android): this ends up slightly too high when the browser renders
      // UI (URL bar, nav buttons) at the bottom of the screen. The visual
      // viewport is shrunk by the full keyboard height as if the keyboard's
      // bottom were flush with the layout viewport's bottom, but the browser UI
      // clips the layout viewport without clipping the keyboard.
      const offset =
        window.innerHeight - (viewport.offsetTop + viewport.height);
      setKeyboardOffset(offset);
    };

    updatePosition();
    viewport.addEventListener("resize", updatePosition);
    viewport.addEventListener("scroll", updatePosition);

    return () => {
      viewport.removeEventListener("resize", updatePosition);
      viewport.removeEventListener("scroll", updatePosition);
    };
  }, []);

  // Renders the editor instance using a React component, plus a dummy toolbar
  // that tracks the top of the virtual keyboard.
  return (
    <>
      <BlockNoteView editor={editor} formattingToolbar={false} />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: `${keyboardOffset}px`,
          height: "44px",
          backgroundColor: "rgba(0, 0, 255, 0.3)",
        }}
      />
    </>
  );
}
