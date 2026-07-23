// Ambient type declarations for internal @blocknote/* deep imports used in
// browser component tests. Vite resolves the runtime import via its alias
// config (see vite.config.browser.ts); these declarations give `tsc` a type
// surface WITHOUT descending into the package sources (which would break the
// composite build with TS6059).

declare module "@blocknote/react/components/Comments/FrimoussePicker.js" {
  import type { ComponentType } from "react";
  import type { EmojiI18n } from "@blocknote/emoji-data";

  type Props = {
    columns?: number;
    onEmojiSelect: (emoji: { native: string }) => void;
    locale: string;
    i18n?: EmojiI18n;
    emojibaseUrl?: string;
  };

  const FrimoussePicker: ComponentType<Props>;
  export default FrimoussePicker;
}

declare module "@blocknote/react/components/SuggestionMenu/EmojiPicker/InlineEmojiPicker.js" {
  import type { ComponentType } from "react";

  type Props = {
    query: string;
    closeMenu: () => void;
    clearQuery: () => void;
  };

  export const InlineEmojiPicker: ComponentType<Props>;
}
