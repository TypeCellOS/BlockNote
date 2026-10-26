import type { Dictionary } from "@blocknote/core";
import { EmojiPicker, type EmojiData, type EmojiDataResolver } from "frimousse";

type EmojiSupport = {
  emojiVersion: number;
  countryFlags: boolean;
};

const CANVAS_SIZE = 2;
const EMOJI_FONT_FAMILY =
  "'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', 'Android Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', EmojiSymbols, sans-serif";

let emojiSupportContext: CanvasRenderingContext2D | null = null;

// Keep this in sync with Frimousse's private platform-support detector. Custom
// resolvers otherwise bypass the filtering applied by its default resolver.
function isEmojiSupported(emoji: string): boolean {
  try {
    emojiSupportContext ??= document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
  } catch {}

  if (!emojiSupportContext) {
    return false;
  }

  queueMicrotask(() => {
    emojiSupportContext = null;
  });

  emojiSupportContext.canvas.width = CANVAS_SIZE;
  emojiSupportContext.canvas.height = CANVAS_SIZE;
  emojiSupportContext.font = `2px ${EMOJI_FONT_FAMILY}`;
  emojiSupportContext.textBaseline = "middle";

  if (emojiSupportContext.measureText(emoji).width >= CANVAS_SIZE * 2) {
    return false;
  }

  emojiSupportContext.fillStyle = "#00f";
  emojiSupportContext.fillText(emoji, 0, 0);
  const blue = emojiSupportContext.getImageData(
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  ).data;

  emojiSupportContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  emojiSupportContext.fillStyle = "#f00";
  emojiSupportContext.fillText(emoji, 0, 0);
  const red = emojiSupportContext.getImageData(
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  ).data;

  for (let index = 0; index < CANVAS_SIZE * CANVAS_SIZE * 4; index += 4) {
    if (
      blue[index] !== red[index] ||
      blue[index + 1] !== red[index + 1] ||
      blue[index + 2] !== red[index + 2]
    ) {
      return false;
    }
  }

  return true;
}

function getEmojiSupport(data: EmojiData): EmojiSupport {
  const versionEmojis = new Map<number, string>();

  for (const emoji of data.emojis) {
    if (!versionEmojis.has(emoji.version)) {
      versionEmojis.set(emoji.version, emoji.emoji);
    }
  }

  const descendingVersions = [...versionEmojis.keys()].sort(
    (first, second) => second - first,
  );
  const highestVersion = descendingVersions[0] ?? 0;
  const countryFlags = isEmojiSupported("🇪🇺");

  for (const version of descendingVersions) {
    if (isEmojiSupported(versionEmojis.get(version)!)) {
      return { emojiVersion: version, countryFlags };
    }
  }

  return { emojiVersion: highestVersion, countryFlags };
}

export function filterEmojiDataForPlatform(
  data: EmojiData,
  support: EmojiSupport,
  emojiVersion?: number,
): EmojiData {
  return {
    ...data,
    emojis: data.emojis.filter((emoji) => {
      const isSupportedVersion =
        emoji.version <= (emojiVersion ?? support.emojiVersion);

      return emoji.countryFlag
        ? isSupportedVersion && support.countryFlags
        : isSupportedVersion;
    }),
  };
}

export async function resolveBlockNoteEmojiData(
  locale: Parameters<EmojiDataResolver>[0],
  { emojiVersion, signal }: Parameters<EmojiDataResolver>[1] = {},
): Promise<EmojiData> {
  const { loadFrimousseData } = await import("@blocknote/core/emoji-data");
  signal?.throwIfAborted();
  const data = await loadFrimousseData(locale);
  signal?.throwIfAborted();

  return filterEmojiDataForPlatform(data, getEmojiSupport(data), emojiVersion);
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
  onEscape?: () => void;
  locale: string;
  dictionary?: Dictionary["emoji_picker"];
  emojibaseUrl?: string;
};

export default function FrimoussePicker({
  columns = 9,
  onEmojiSelect,
  onEscape,
  locale,
  dictionary,
  emojibaseUrl,
}: Props) {
  const placeholder = `${dictionary?.search ?? "Search"}…`;

  return (
    <EmojiPicker.Root
      className="bn-frimousse-picker"
      locale={locale}
      columns={columns}
      emojibaseUrl={emojibaseUrl}
      resolveEmojiData={emojibaseUrl ? undefined : resolveBlockNoteEmojiData}
      onEmojiSelect={(emoji) => onEmojiSelect({ native: emoji.emoji })}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && onEscape) {
          event.stopPropagation();
          onEscape();
        }
      }}
    >
      <EmojiPicker.Search
        placeholder={dictionary?.search ?? "Search"}
        autoFocus
      />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading className="bn-frimousse-loading">
          {dictionary?.loading ?? "Loading…"}
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="bn-frimousse-empty">
          {dictionary?.search_no_results ?? "No emoji found."}
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
              <button type="button" className="bn-frimousse-emoji" {...props}>
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
