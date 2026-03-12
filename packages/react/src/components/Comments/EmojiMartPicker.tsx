import { EmojiPicker } from "frimousse";
import { useEffect, useRef } from "react";

export default function FrimoussePicker(props: {
  onEmojiSelect?: (emoji: { native: string }) => void;
  onClickOutside?: () => void;
  theme?: "light" | "dark";
  perLine?: number;
  /**
   * Override the base URL for emojibase data.
   * By default, frimousse fetches from cdn.jsdelivr.net.
   * Set this to a self-hosted URL for privacy or offline use.
   */
  emojibaseUrl?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!props.onClickOutside) {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        props.onClickOutside?.();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [props.onClickOutside]);

  return (
    <div ref={rootRef}>
      <EmojiPicker.Root
        className="bn-frimousse-picker"
        onEmojiSelect={(emoji) => {
          props.onEmojiSelect?.({ native: emoji.emoji });
        }}
        columns={props.perLine ?? 7}
        emojibaseUrl={props.emojibaseUrl}
      >
        <EmojiPicker.Search
          className="bn-frimousse-search"
          autoFocus={true}
        />
        <EmojiPicker.Viewport className="bn-frimousse-viewport">
          <EmojiPicker.Loading className="bn-frimousse-loading">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="bn-frimousse-empty">
            No emoji found.
          </EmojiPicker.Empty>
          <EmojiPicker.List />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </div>
  );
}
