import { isTouchDevice } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  useBlockNoteEditor,
  useCreateBlockNote,
  useUIMode,
} from "@blocknote/react";
import { Button, Popover, TextInput } from "@mantine/core";
import { PointerEvent } from "react";

// Enough content that the editor overflows and you can scroll a selection (and
// with it the formatting toolbar) down to the bottom of the screen.
const initialContent = [
  { type: "paragraph" as const, content: "Welcome to this demo!" },
  {
    type: "paragraph" as const,
    content:
      "Select some text to bring up the formatting toolbar, then open the " +
      "popover and focus its input - the keyboard now stays open.",
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    type: "paragraph" as const,
    content:
      `Filler paragraph ${i + 1}. Select some text here, low in the ` +
      "viewport, then open the popover and tap the input.",
  })),
];

// A single button in the formatting toolbar that opens a Mantine popover with a
// text input inside it - a minimal stand-in for buttons like the file caption /
// rename buttons, which do the same.
//
// The popover is set up exactly as BlockNote sets up its own (see the mantine
// `Popover` wrapper and `FileCaptionButton`), so that opening it on mobile
// doesn't blur the editor and dismiss the on-screen keyboard: the trigger
// button prevents `mousedown` on touch, and on mobile the dropdown is portalled
// out of the horizontally-scrolling toolbar with `trapFocus` disabled so it
// doesn't pull focus into itself. See the `popover-input-keyboard` example.
function PopoverInputButton() {
  const editor = useBlockNoteEditor();
  const uiMode = useUIMode();

  const portalRoot = uiMode === "mobile" ? editor.portalElement : undefined;

  // Scrolling the input into view just before focus moves to it works around
  // the Android Chrome issue where focusing an input inside a popover opens the
  // virtual keyboard and then immediately dismisses it. This is the fix from
  // PR #2982.
  //
  // This has to run on pointer-down capture, not click: focus lands on the
  // pointer-down that starts the gesture, so by the time `click` fires the
  // keyboard is already opening and scrolling then would disrupt it (dismissing
  // the keyboard in every position). `block: "nearest"` scrolls only when the
  // input isn't already visible, so it doesn't jump when unnecessary.
  const handlePointerDownCapture = (event: PointerEvent<HTMLInputElement>) => {
    event.currentTarget.scrollIntoView({ block: "nearest" });
  };

  return (
    <Popover
      position="top"
      withArrow
      withinPortal={!!portalRoot}
      portalProps={portalRoot ? { target: portalRoot } : undefined}
      trapFocus={portalRoot ? false : undefined}
    >
      <Popover.Target>
        <Button
          onMouseDown={(event) => {
            if (isTouchDevice()) {
              event.preventDefault();
            }
          }}
        >
          Open popover
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <TextInput
          placeholder="Focus me"
          onPointerDownCapture={handlePointerDownCapture}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

function CustomFormattingToolbar() {
  return (
    <FormattingToolbar>
      <PopoverInputButton />
    </FormattingToolbar>
  );
}

export default function App() {
  const editor = useCreateBlockNote({ initialContent });

  // The same editor + dummy formatting toolbar as the `popover-input-keyboard`
  // example, but with the fix from PR #2982 applied to the popover input.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
