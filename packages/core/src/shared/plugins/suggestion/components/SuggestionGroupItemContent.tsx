import SuggestionItem from "../SuggestionItem";
import styles from "./SuggestionGroup.module.css";

export function SuggestionGroupItemContent<T extends SuggestionItem>(props: {
  item: T;
}) {
  return (
    <div className={styles.suggestionWrapper}>
      <div>
        <div className={styles.buttonName}>{props.item.name}</div>
        {props.item.hint && (
          <div className={styles.buttonHint}>{props.item.hint}</div>
        )}
      </div>
      {props.item.shortcut && (
        <div>
          <div className={styles.buttonShortcut}>{props.item.shortcut}</div>
        </div>
      )}
    </div>
  );
}
