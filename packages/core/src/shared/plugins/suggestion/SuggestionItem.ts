/**
 * A generic interface used in all suggestion menus (slash menu, mentions, etc)
 */
export interface SuggestionItem {
  /**
   * The name of the item
   */
  name: string;

  /**
   * The name of the group to which this item belongs
   */
  groupName: string;

  hint?: string;

  shortcut?: string;

  /**
   * This function matches this item against a query string, the function should return **true** if the item
   * matches the query or **false** otherwise.
   *
   * @param query the query string
   */
  match(query: string): boolean;
}
