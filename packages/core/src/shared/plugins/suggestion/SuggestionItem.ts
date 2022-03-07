import { RemixiconReactIconComponentType } from "remixicon-react";

/**
 * A generic interface used in all suggestion menus (slash menu, mentions, etc)
 */
export default interface SuggestionItem {
  /**
   * The name of the item
   */
  name: string;

  /**
   * The name of the group to which this item belongs
   */
  groupName: string;

  /**
   * The react icon
   */
  icon?: RemixiconReactIconComponentType;

  /**
   * This function matches this item against a query string, the function should return **true** if the item
   * matches the query or **false** otherwise.
   *
   * **TODO:** instead of a boolean this function could return a number indicating the quality of the match,
   * zero indicating that there is no match. This number could then be used to order suggestions based on
   * how good each item matches the query (instead of which item is declared first), to improve UX.
   *
   * @param query the query string
   */
  match(query: string): boolean;
}
