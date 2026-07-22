import type { EmojiI18n } from "@blocknote/emoji-data";
import { ReactNode, useEffect, useState } from "react";

import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import FrimoussePicker from "./FrimoussePicker.js";

function useEmojiI18n(locale: string): EmojiI18n | undefined {
  const [i18n, setI18n] = useState<EmojiI18n | undefined>(undefined);

  useEffect(() => {
    void import("@blocknote/emoji-data").then(({ loadEmojiLocale }) =>
      loadEmojiLocale(locale).then(setI18n),
    );
  }, [locale]);

  return i18n;
}

export const EmojiPicker = (props: {
  onEmojiSelect: (emoji: { native: string }) => void;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  const Components = useComponentsContext()!;
  const blockNoteContext = useBlockNoteContext()!;
  const portalRoot = blockNoteContext.editor?.portalElement;
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const emojiI18n = useEmojiI18n(locale);

  if (!portalRoot) {
    throw new Error("Portal root not found");
  }

  return (
    <Components.Generic.Popover.Root open={open} portalRoot={portalRoot}>
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
