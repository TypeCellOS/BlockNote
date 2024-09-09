import type { Dictionary } from "../../i18n/dictionary";

export type DefaultSuggestionItem = {
  dictKey: keyof Dictionary["slash_menu"];
  title: string;
  onItemClick: () => void;
  subtext?: string;
  badge?: string;
  aliases?: string[];
  group?: string;
};
