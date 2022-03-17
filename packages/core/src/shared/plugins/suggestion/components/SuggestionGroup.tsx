import { ButtonItem, Section } from "@atlaskit/menu";
import React from "react";
import SuggestionItem from "../SuggestionItem";
import styles from "./SuggestionGroup.module.css";

const MIN_LEFT_MARGIN = 5;

function SuggestionContent<T extends SuggestionItem>(props: { item: T }) {
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

function getIcon<T extends SuggestionItem>(
  item: T,
  isButtonSelected: boolean
): JSX.Element | undefined {
  const Icon = item.icon;
  return (
    Icon && (
      <div className={styles.iconWrapper}>
        <Icon
          className={
            styles.icon + " " + (isButtonSelected ? styles.selectedIcon : "")
          }
        />
      </div>
    )
  );
}

type SuggestionComponentProps<T> = {
  item: T;
  index: number;
  selectedIndex?: number;
  clickItem: (item: T) => void;
};

function SuggestionComponent<T extends SuggestionItem>(
  props: SuggestionComponentProps<T>
) {
  let isButtonSelected =
    props.selectedIndex !== undefined && props.selectedIndex === props.index;

  const buttonRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (
      isButtonSelected &&
      buttonRef.current &&
      buttonRef.current.getBoundingClientRect().left > MIN_LEFT_MARGIN //TODO: Kinda hacky, fix
      // This check is needed because initially the menu is initialized somewhere above outside the screen (with left = 1)
      // scrollIntoView() is called before the menu is set in the right place, and without the check would scroll to the top of the page every time
    ) {
      buttonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isButtonSelected]);

  return (
    <div className={styles.buttonItem}>
      <ButtonItem
        isSelected={isButtonSelected} // This is needed to navigate with the keyboard
        iconBefore={getIcon(props.item, isButtonSelected)}
        onClick={(_e) => {
          setTimeout(() => {
            props.clickItem(props.item);
          }, 0);

          // e.stopPropagation();
          // e.preventDefault();
        }}
        ref={buttonRef}>
        <SuggestionContent item={props.item} />
      </ButtonItem>
    </div>
  );
}

type SuggestionGroupProps<T> = {
  /**
   * Name of the group
   */
  name: string;

  /**
   * The list of items
   */
  items: T[];

  /**
   * Index of the selected item in this group; relative to this item group (so 0 refers to the first item in this group)
   * This should be 'undefined' if none of the items in this group are selected
   */
  selectedIndex?: number;

  /**
   * Callback that gets executed when an item is clicked on.
   */
  clickItem: (item: T) => void;
};

export function SuggestionGroup<T extends SuggestionItem>(
  props: SuggestionGroupProps<T>
) {
  return (
    <Section title={props.name}>
      {props.items.map((item, index) => {
        return (
          <SuggestionComponent
            item={item}
            key={index} // TODO: using index as key is not ideal for performance, better have ids on suggestionItems
            index={index}
            selectedIndex={props.selectedIndex}
            clickItem={props.clickItem}
          />
        );
      })}
    </Section>
  );
}
