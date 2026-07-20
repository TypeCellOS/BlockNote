export interface EmojiSkin {
  native: string;
}

export interface Emoji {
  id: string;
  name: string;
  keywords: string[];
  skins: EmojiSkin[];
}

export interface EmojiCategory {
  id: string;
  emojis: string[];
}

export interface EmojiMartData {
  categories: EmojiCategory[];
  emojis: Record<string, Emoji>;
  aliases: Record<string, string>;
  sheet: { cols: number; rows: number };
}
