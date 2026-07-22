export interface FrimousseEmoji {
  emoji: string;
  category: number;
  version: number;
  label: string;
  tags: string[];
  countryFlag?: true;
  skins?: Record<
    "light" | "medium-light" | "medium" | "medium-dark" | "dark",
    string
  >;
}

export interface FrimousseCategory {
  index: number;
  label: string;
}

export interface FrimousseEmojiData {
  locale: string;
  emojis: FrimousseEmoji[];
  categories: FrimousseCategory[];
  skinTones: Record<
    "light" | "medium-light" | "medium" | "medium-dark" | "dark",
    string
  >;
}
