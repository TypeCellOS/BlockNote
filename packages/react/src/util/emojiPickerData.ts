import type { EmojiData, EmojiDataResolver } from "frimousse";

type EmojiSupport = {
  emojiVersion: number;
  countryFlags: boolean;
};

const CANVAS_SIZE = 2;
const EMOJI_FONT_FAMILY =
  "'Apple Color Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', 'Android Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', EmojiSymbols, sans-serif";

// Keep this in sync with Frimousse's private platform-support detector. Custom
// resolvers otherwise bypass the filtering applied by its default resolver.
function isEmojiSupported(
  context: CanvasRenderingContext2D | null,
  emoji: string,
): boolean {
  if (!context) {
    return false;
  }

  context.canvas.width = CANVAS_SIZE;
  context.canvas.height = CANVAS_SIZE;
  context.font = `2px ${EMOJI_FONT_FAMILY}`;
  context.textBaseline = "middle";

  if (context.measureText(emoji).width >= CANVAS_SIZE * 2) {
    return false;
  }

  context.fillStyle = "#00f";
  context.fillText(emoji, 0, 0);
  const blue = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.fillStyle = "#f00";
  context.fillText(emoji, 0, 0);
  const red = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

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
  // Reuse one canvas for this synchronous detection pass, then let it go.
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
  } catch {}

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
  const countryFlags = isEmojiSupported(context, "🇪🇺");

  for (const version of descendingVersions) {
    if (isEmojiSupported(context, versionEmojis.get(version)!)) {
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

      return isSupportedVersion && (!emoji.countryFlag || support.countryFlags);
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
