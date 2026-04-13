import { ReactNode, useState } from "react";

import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import Picker from "./EmojiMartPicker.js";

export const EmojiPicker = (props: {
  onEmojiSelect: (emoji: { native: string }) => void;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  const Components = useComponentsContext()!;
  const blockNoteContext = useBlockNoteContext()!;
  const portalRoot = blockNoteContext.editor?.portalElement;

  if (!portalRoot) {
    throw new Error("Portal root not found");
  }

  return (
    <Components.Generic.Popover.Root open={open} portalRoot={portalRoot}>
      <Components.Generic.Popover.Trigger>
        <div
          onClick={(event) => {
            // Needed as the Picker component's onClickOutside handler
            // fires immediately after otherwise, preventing the popover
            // from opening.
            event.preventDefault();
            event.stopPropagation();
            setOpen(!open);
            props.onOpenChange?.(!open);
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
      <Components.Generic.Popover.Content
        className={"bn-emoji-picker-popover"}
        variant={"panel-popover"}
      >
        <Picker
          perLine={7}
          onClickOutside={() => {
            setOpen(false);
            props.onOpenChange?.(false);
          }}
          onEmojiSelect={(emoji: { native: string }) => {
            props.onEmojiSelect(emoji);
            setOpen(false);
            props.onOpenChange?.(false);
          }}
          theme={blockNoteContext?.colorSchemePreference}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
