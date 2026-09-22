import { ReactNode, useState } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { usePortalElement } from "../../editor/PortalElementOverride.js";
import { useDictionary } from "../../i18n/dictionary.js";
import FrimoussePicker, { useEmojiI18n } from "./FrimoussePicker.js";

export const EmojiPicker = (props: {
  onEmojiSelect: (emoji: { native: string }) => void;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const emojiI18n = useEmojiI18n(locale);

  return (
    <Components.Generic.Popover.Root open={open} portalElement={portalElement}>
      <Components.Generic.Popover.Trigger>
        <div
          onClick={(event) => {
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
        {open && (
          <FrimoussePicker
            onEmojiSelect={(emoji) => {
              props.onEmojiSelect(emoji);
              setOpen(false);
              props.onOpenChange?.(false);
            }}
            locale={locale}
            i18n={emojiI18n}
          />
        )}
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
