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

// Enough content that the editor overflows and you can scroll a selection (and
// with it the formatting toolbar) down to the bottom of the screen.
const initialContent = [
  { type: "paragraph" as const, content: "Welcome to this demo!" },
  {
    type: "paragraph" as const,
    content:
      "Select some text to bring up the formatting toolbar, then open the " +
      "popover and focus its input.",
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
// doesn't blur the editor and dismiss the on-screen keyboard:
//
// - The trigger button prevents `mousedown` on touch, so tapping it doesn't
//   move focus off the editor (the click still fires to toggle the popover).
// - On mobile the dropdown is portalled out of the horizontally-scrolling
//   toolbar (which would otherwise clip it), and `trapFocus` is disabled so the
//   dropdown doesn't pull focus into itself when it opens.
//
// Without these, focus leaves the editor when the popover opens, the mobile
// formatting toolbar (which only shows while the editor is focused) unmounts,
// and the popover disappears with it.
function PopoverInputButton() {
  const editor = useBlockNoteEditor();
  const uiMode = useUIMode();

  const portalRoot = uiMode === "mobile" ? editor.portalElement : undefined;

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
        <TextInput placeholder="Focus me" />
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

  // A real editor with a dummy formatting toolbar holding a single Mantine
  // popover + input, mirroring the real thing (a popover input in the toolbar).
  //
  // On Android Chrome, focusing the input while the toolbar is low in the
  // viewport opens the virtual keyboard and then immediately dismisses it: the
  // shrinking visual viewport makes the browser try to scroll the input into
  // view, but it can't scroll to an input inside a popover, so it blurs it. See
  // the `popover-input-scroll-fix` example for a workaround.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
