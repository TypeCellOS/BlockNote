import type { Dictionary } from "@blocknote/core";
import { EmojiPicker } from "frimousse";
import { resolveBlockNoteEmojiData } from "../../util/emojiPickerData.js";

export function ActiveEmojiDisplay({
  emoji,
  label,
  placeholder,
}: {
  emoji?: string;
  label?: string;
  placeholder: string;
}) {
  return (
    <div className="bn-frimousse-active-emoji">
      {emoji && (
        <span className="bn-frimousse-active-emoji-glyph">{emoji}</span>
      )}
      <span className="bn-frimousse-active-emoji-label">
        {emoji ? label : placeholder}
      </span>
    </div>
  );
}

type Props = {
  onEmojiSelect: (emoji: string) => void;
  onEscape?: () => void;
  locale: string;
  dictionary?: Dictionary["emoji_picker"];
};

export default function FrimoussePicker({
  onEmojiSelect,
  onEscape,
  locale,
  dictionary,
}: Props) {
  const placeholder = `${dictionary?.search ?? "Search"}…`;

  return (
    <EmojiPicker.Root
      className="bn-frimousse-picker"
      locale={locale}
      resolveEmojiData={resolveBlockNoteEmojiData}
      onEmojiSelect={({ emoji }) => onEmojiSelect(emoji)}
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
        <EmojiPicker.List />
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
