import type { Dictionary } from "../../i18n/dictionary.js";

export type DefaultSuggestionItem = {
  key: keyof Omit<Dictionary["slash_menu"], "page_break">;
  title: string;
  onItemClick: () => void;
  subtext?: string;
  badge?: string;
  aliases?: string[];
  group?: string;
};
