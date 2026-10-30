import { defaultInlineContentSchema } from "@blocknote/core";
import { type SuggestionMenuOptions } from "@blocknote/core/extensions";
import { autoPlacement, offset, shift, size } from "@floating-ui/react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "../../Popovers/FloatingUIOptions.js";
import { SuggestionMenuPopover } from "../SuggestionMenuPopover.js";
import { InlineEmojiPicker } from "./InlineEmojiPicker.js";

const middleware = [
  offset(10),
  autoPlacement({
    allowedPlacements: ["bottom-start", "top-start"],
    padding: 10,
  }),
  shift(),
  size({
    apply({ elements, availableHeight }) {
      elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
    },
    padding: 10,
  }),
];

export function EmojiPickerController(props: {
  triggerCharacter: string;
  shouldOpen?: SuggestionMenuOptions["shouldOpen"];
  minQueryLength?: number;
  floatingUIOptions?: FloatingUIOptions;
  portalElement?: HTMLElement | null;
}) {
  const editor = useBlockNoteEditor();
  const hasTextInlineContent =
    "text" in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema.text === defaultInlineContentSchema.text;

  return (
    <SuggestionMenuPopover
      {...props}
      minQueryLength={props.minQueryLength ?? 2}
      enabled={hasTextInlineContent}
      middleware={middleware}
      zIndex={70}
    >
      {(menuProps) => <InlineEmojiPicker {...menuProps} />}
    </SuggestionMenuPopover>
  );
}
