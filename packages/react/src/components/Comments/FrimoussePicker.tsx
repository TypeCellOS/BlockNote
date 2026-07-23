import type { EmojiI18n } from "@blocknote/emoji-data";
import { EmojiPicker } from "frimousse";
import { useEffect, useState } from "react";

export function useEmojiI18n(locale: string): EmojiI18n | undefined {
  const [i18n, setI18n] = useState<EmojiI18n | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void import("@blocknote/emoji-data").then(({ loadEmojiLocale }) =>
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

export function useResolvedLocale(
  locale: string,
  emojibaseUrl?: string,
): string | undefined {
  const [resolvedLocale, setResolvedLocale] = useState<string | undefined>(
    emojibaseUrl ? locale : undefined,
  );

  useEffect(() => {
    if (emojibaseUrl) {
      setResolvedLocale(locale);
      return;
    }
    let cancelled = false;
    void import("@blocknote/emoji-data").then(({ seedFrimousseCache }) =>
      seedFrimousseCache(locale).then((seededLocale) => {
        if (!cancelled) {
          setResolvedLocale(seededLocale);
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [locale, emojibaseUrl]);

  return resolvedLocale;
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
  const resolvedLocale = useResolvedLocale(locale, emojibaseUrl);

  if (!resolvedLocale) {
    return null;
  }

  // Frimousse looks up its cache by the `locale` prop, so we must pass the
  // locale the data was actually seeded under (from `seedFrimousseCache`). For
  // aliased locales like `no`/`zh-tw` this is the resolved emojibase code
  // (`nb`/`zh-hant`); passing the raw locale would miss the seeded entry and
  // trigger a CDN fetch. Frimousse's Locale type only covers the emojibase
  // locales, so we cast.
  const frimousseLocale = resolvedLocale as any;
  const placeholder = `${i18n?.search ?? "Search"}…`;

  return (
    <EmojiPicker.Root
      className="bn-frimousse-picker"
      locale={frimousseLocale}
      columns={columns}
      emojibaseUrl={emojibaseUrl}
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
