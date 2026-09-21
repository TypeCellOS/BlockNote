import type { EmojiI18n } from "@blocknote/core/emoji-data";
import { EmojiPicker, type EmojiData } from "frimousse";
import { useEffect, useState } from "react";

export async function resolveBlockNoteEmojiData(
  locale: string,
): Promise<EmojiData> {
  const { loadFrimousseData } = await import("@blocknote/core/emoji-data");
  return loadFrimousseData(locale);
}

export function useEmojiI18n(locale: string): EmojiI18n | undefined {
  const [i18n, setI18n] = useState<EmojiI18n | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void import("@blocknote/core/emoji-data").then(({ loadEmojiLocale }) =>
      loadEmojiLocale(locale).then((data) => {
        if (!cancelled) {
          setI18n(data);
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return i18n;
}

export function ActiveEmojiDisplay({
  emoji,
  label,
  placeholder,
}: {
  emoji?: string;
  label?: string;
  placeholder: string;
}) {
  return emoji ? (
    <div className="bn-frimousse-active-emoji">
      <span className="bn-frimousse-active-emoji-glyph">{emoji}</span>
      <span className="bn-frimousse-active-emoji-label">{label}</span>
    </div>
  ) : (
    <div className="bn-frimousse-active-emoji">
      <span className="bn-frimousse-active-emoji-label bn-frimousse-active-emoji-placeholder">
        {placeholder}
      </span>
    </div>
  );
}

type Props = {
  columns?: number;
  onEmojiSelect: (emoji: { native: string }) => void;
  locale: string;
  i18n?: EmojiI18n;
  emojibaseUrl?: string;
};

export default function FrimoussePicker({
  columns = 9,
  onEmojiSelect,
  locale,
  i18n,
  emojibaseUrl,
}: Props) {
  const placeholder = `${i18n?.search ?? "Search"}…`;

  return (
    <EmojiPicker.Root
      className="bn-frimousse-picker"
      locale={locale}
      columns={columns}
      emojibaseUrl={emojibaseUrl}
      resolveEmojiData={emojibaseUrl ? undefined : resolveBlockNoteEmojiData}
      onEmojiSelect={(emoji) => onEmojiSelect({ native: emoji.emoji })}
    >
      <EmojiPicker.Search placeholder={i18n?.search ?? "Search"} autoFocus />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading className="bn-frimousse-loading">
          Loading…
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="bn-frimousse-empty">
          {i18n?.searchNoResults ?? "No emoji found."}
        </EmojiPicker.Empty>
        <EmojiPicker.List
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div className="bn-frimousse-category-header" {...props}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="bn-frimousse-row" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button className="bn-frimousse-emoji" {...props}>
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
      <div className="bn-frimousse-footer">
        <EmojiPicker.ActiveEmoji>
          {({ emoji }) => (
            <ActiveEmojiDisplay
              emoji={emoji?.emoji}
              label={emoji?.label}
              placeholder={placeholder}
            />
          )}
        </EmojiPicker.ActiveEmoji>
        <EmojiPicker.SkinToneSelector className="bn-frimousse-skin-tone" />
      </div>
    </EmojiPicker.Root>
  );
}
