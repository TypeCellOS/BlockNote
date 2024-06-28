import { SuggestionMenuProps } from "./types";

export default function EmojiMenu(
  props: SuggestionMenuProps<any>
): JSX.Element {
  //this is the component which renders emoji picker with the emojis searched.
  const { items, selectedIndex, onItemClick } = props;

  return (
    <div
      className="bn-emoji-menu"
      style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
      {items.map((item, index) => (
        <p
          key={index}
          className={index === selectedIndex ? "emoji-selected" : ""}
          onClick={() => onItemClick?.(item)}>
          {item}
        </p>
      ))}
    </div>
  );
}
