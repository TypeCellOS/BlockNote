import { PopupMenuGroup, Section } from "@atlaskit/menu";
import styles from "../../menus/SideMenu.module.css";
import { SuggestionGroup } from "./SuggestionGroup";
import SuggestionItem from "./SuggestionItem";

export type SuggestionListProps<T> = {
  /**
   * Object containing all suggestion items, grouped by their `groupName`.
   */
  groups: {
    [groupName: string]: T[];
  };

  /**
   * The total number of suggestion-items
   */
  count: number;

  /**
   * This callback gets executed whenever an item is clicked on
   */
  onSelectItem: (item: T) => void;

  /**
   * The index of the item that is currently selected (but not yet clicked on)
   */
  selectedIndex: number;
};

/**
 * Stateless component that renders the suggestion list
 */
export function SuggestionList<T extends SuggestionItem>(
  props: SuggestionListProps<T>
) {
  const renderedGroups = [];

  let currentGroupIndex = 0;

  for (const groupName in props.groups) {
    const items = props.groups[groupName];

    renderedGroups.push(
      <SuggestionGroup
        key={groupName}
        name={groupName}
        items={items}
        selectedIndex={
          props.selectedIndex >= currentGroupIndex
            ? props.selectedIndex - currentGroupIndex
            : undefined
        }
        clickItem={props.onSelectItem}></SuggestionGroup>
    );

    currentGroupIndex += items.length;
  }

  return (
    <div className={styles.menuList}>
      <PopupMenuGroup maxWidth="250px" maxHeight="400px">
        {renderedGroups.length > 0 ? (
          renderedGroups
        ) : (
          <Section title={"No match found"}> </Section>
        )}
      </PopupMenuGroup>
    </div>

    // doesn't work well yet, maybe https://github.com/atomiks/tippyjs-react/issues/173
    // We now render the tippy element manually in SuggestionListReactRenderer
    // <Tippy
    //   visible={true}
    //   placement="bottom-start"
    //   content={
    //     <div className={styles.menuList}>
    //       <PopupMenuGroup maxWidth="250px" maxHeight="400px">
    //         {renderedGroups.length > 0 ? (
    //           renderedGroups
    //         ) : (
    //           <Section title={"No match found"}> </Section>
    //         )}
    //       </PopupMenuGroup>
    //     </div>
    //   }
    //   interactive={false}>
    //   <div></div>
    // </Tippy>
  );
}
