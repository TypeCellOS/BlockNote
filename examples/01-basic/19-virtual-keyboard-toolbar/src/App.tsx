import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

// Minimal typing for the Virtual Keyboard API, which isn't part of the DOM lib
// types yet. Only available on Chrome, Edge & their derivatives.
interface VirtualKeyboard extends EventTarget {
  overlaysContent: boolean;
  boundingRect: DOMRect;
}

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Height of the virtual keyboard in pixels, used to position the dummy
  // toolbar just above it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const virtualKeyboard = (
      navigator as unknown as { virtualKeyboard?: VirtualKeyboard }
    ).virtualKeyboard;
    if (!virtualKeyboard) {
      return;
    }

    // Tells the browser to overlay the keyboard on top of the content instead
    // of resizing the viewport, and to expose its geometry via the API.
    virtualKeyboard.overlaysContent = true;

    const updatePosition = () => {
      // `boundingRect.height` is the keyboard height measured from the bottom of
      // the screen. This is correct on its own, but the toolbar is positioned
      // relative to the layout viewport, which on Android starts below the
      // browser UI at the bottom of the screen - so the toolbar still ends up
      // slightly too high there.
      setKeyboardHeight(virtualKeyboard.boundingRect.height);
    };

    updatePosition();
    virtualKeyboard.addEventListener("geometrychange", updatePosition);

    return () => {
      virtualKeyboard.overlaysContent = false;
      virtualKeyboard.removeEventListener("geometrychange", updatePosition);
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
          bottom: `${keyboardHeight}px`,
          height: "44px",
          backgroundColor: "rgba(0, 0, 255, 0.3)",
        }}
      />
    </>
  );
}
