import { ReactNode, useState } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import Picker from "./EmojiMartPicker.js";
import { createPortal } from "react-dom";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";

export const EmojiPicker = (props: {
  onEmojiSelect: (emoji: { native: string }) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const blockNoteContext = useBlockNoteContext();

  return (
    <Components.Generic.Popover.Root opened={open}>
      <Components.Generic.Popover.Trigger>
        <div
          onClick={(event) => {
            // Needed as the Picker component's onClickOutside handler
            // fires immediately after otherwise, preventing the popover
            // from opening.
            event.preventDefault();
            event.stopPropagation();
            setOpen(!open);
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {props.children}
        </div>
      </Components.Generic.Popover.Trigger>
      {createPortal(
        <Components.Generic.Popover.Content
          className={"bn-emoji-picker-popover"}
          variant={"panel-popover"}
        >
          <Picker
            // dynamicWidth={true}
            perLine={7}
            onClickOutside={() => setOpen(false)}
            onEmojiSelect={(emoji: { native: string }) => {
              props.onEmojiSelect(emoji);
              setOpen(false);
            }}
            theme={blockNoteContext?.colorSchemePreference}
          />
        </Components.Generic.Popover.Content>,
        editor.domElement!.parentElement!,
      )}
    </Components.Generic.Popover.Root>
  );
};
