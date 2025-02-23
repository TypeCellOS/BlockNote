import Picker from "@emoji-mart/react";
import { ReactNode, useState } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";

export const EmojiPicker = (props: {
  onEmojiSelect: (emoji: { native: string }) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  const Components = useComponentsContext()!;
  const blockNoteContext = useBlockNoteContext();

  return (
    <Components.Generic.Popover.Root opened={open}>
      <Components.Generic.Popover.Trigger>
        <div
          onMouseDown={(event) => {
            // Prevents event from bubbling up to the parent comment and
            // selecting it in the thread stream view.
            event.preventDefault();
            event.stopPropagation();
          }}
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
          }}>
          {props.children}
        </div>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content variant={"panel-popover"}>
        <Picker
          onClickOutside={() => setOpen(false)}
          onEmojiSelect={(emoji: { native: string }) => {
            props.onEmojiSelect(emoji);
            setOpen(false);
          }}
          theme={blockNoteContext?.colorSchemePreference}
        />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
