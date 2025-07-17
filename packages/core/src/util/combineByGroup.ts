/**
 * Combines items by group. This can be used to combine multiple slash menu item arrays,
 * while making sure that items from the same group are adjacent to each other.
 */
export function combineByGroup<T extends { group?: string }>(
  items: T[],
  ...additionalItemsArray: {
    group?: string;
  }[][]
) {
  const combinedItems = [...items];
  for (const additionalItems of additionalItemsArray) {
    for (const additionalItem of additionalItems) {
      const lastItemWithSameGroup = combinedItems.findLastIndex(
        (item) => item.group === additionalItem.group,
      );
      if (lastItemWithSameGroup === -1) {
        combinedItems.push(additionalItem as T);
      } else {
        combinedItems.splice(lastItemWithSameGroup + 1, 0, additionalItem as T);
      }
    }
  }
  return combinedItems;
}
