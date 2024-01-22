import { Loader, Menu } from "@mantine/core";

import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { SuggestionMenuProps } from "../../components-shared/SuggestionMenu/SuggestionMenuPositioner";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";

function useLoadItems<T>(
  query: string,
  getItems: (query: string) => Promise<T[]>,
  onNoResults: () => void
) {
  // Used to close the menu if the query is >3 characters longer than the last
  // query that returned any results.
  const lastUsefulQueryLength = useRef(0);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const currentQuery = useRef<string | undefined>();

  useEffect(() => {
    const thisQuery = query;
    currentQuery.current = query;

    setLoading(true);
    getItems(query).then((items) => {
      if (currentQuery.current !== thisQuery) {
        // outdated query returned, ignore the result
        return;
      }
      if (!items) {
        lastUsefulQueryLength.current = query.length;
      } else if (query.length - lastUsefulQueryLength.current > 3) {
        onNoResults();
      }

      setItems(items);
      setLoading(false);
    });
  }, [query, getItems, onNoResults]);

  return { loading, items };
}

export function DefaultSlashMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: SuggestionMenuProps<BSchema, I, S>) {
  const { query, getItems, closeMenu, clearQuery, editor } = props;

  // const [orderedItems, setOrderedItems] = useState<
  //   ReactSlashMenuItem<BSchema, I, S>[] | undefined
  // >(undefined);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const executeItem = useCallback(
    (item: ReactSlashMenuItem<BSchema, I, S>) => {
      closeMenu();
      clearQuery();
      item.execute(editor);
    },
    [clearQuery, closeMenu, editor]
  );

  const { loading, items } = useLoadItems(query, getItems, () => closeMenu());

  // Handles keyboard navigation.
  useEffect(() => {
    const preventMenuNavigationKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex - 1 + items!.length) % items!.length);
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex + 1) % items!.length);
        }

        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (items.length) {
          executeItem(items[selectedIndex]);
        }

        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        closeMenu();

        return true;
      }

      return false;
    };

    editor.domElement.addEventListener(
      "keydown",
      preventMenuNavigationKeys,
      true
    );

    return () => {
      editor.domElement.removeEventListener(
        "keydown",
        preventMenuNavigationKeys,
        true
      );
    };
  }, [
    selectedIndex,
    items,
    editor.domElement,
    closeMenu,
    clearQuery,
    executeItem,
  ]);

  return (
    <MenuComponent
      items={items}
      executeItem={executeItem}
      loading={loading}
      selectedIndex={selectedIndex}
      // TODO
    />
  );
}

function defaultRenderItems(
  items: ReactSlashMenuItem<any, any, any>[],
  selectedIndex: number,
  executeItem: (item: ReactSlashMenuItem<any, any, any>) => void
) {
  if (items === undefined) {
    return null;
  }

  if (items.length === 0) {
    return [];
  }

  const renderedItems: JSX.Element[] = [];
  let currentGroup = undefined;
  let itemIndex = 0;

  // TODO, move to getItems?
  // const orderedItems: ReactSlashMenuItem<BSchema, I, S>[] = [];

  // const groups = groupBy(items, (item) => item.group);

  // foreach(groups, (groupedItems) => {
  //   for (const item of groupedItems) {
  //     orderedItems.push(item);
  //   }
  // });

  for (const item of items) {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      renderedItems.push(
        <Menu.Label key={currentGroup}>{currentGroup}</Menu.Label>
      );
    }

    renderedItems.push(
      <SlashMenuItem
        key={item.name}
        name={item.name}
        icon={item.icon}
        hint={item.hint}
        shortcut={item.shortcut}
        isSelected={selectedIndex === itemIndex}
        onClick={() => executeItem(item)}
      />
    );

    itemIndex++;
  }

  return renderedItems;
}

function MenuComponent<T>(props: {
  loadingState: "loading-initial" | "loading" | "loaded";
  items: T[];
  selectedIndex: number;
  executeItem: (item: T) => void;
  renderItems: (
    items: T[],
    selectedIndex: number,
    executeItem: (item: T) => void
  ) => JSX.Element;
}) {
  const { items, selectedIndex, executeItem } = props;
  // Creates the JSX elements to render.

  const loader =
    props.loadingState !== "loaded" ? (
      <Loader className={"bn-slash-menu-loader"} type="dots" />
    ) : null;

  return (
    <Menu
      withinPortal={false}
      trapFocus={false}
      /** Hacky fix to get the desired menu behaviour. The trigger="hover"
       * attribute allows focus to remain on the editor, allowing for suggestion
       * filtering. The closeDelay=10000000 attribute allows the menu to stay open
       * practically indefinitely, as normally hovering off it would cause it to
       * close due to trigger="hover".
       */
      defaultOpened={true}
      trigger={"hover"}
      closeDelay={10000000}>
      <Menu.Dropdown
        onMouseDown={(event) => event.preventDefault()}
        className={"bn-slash-menu"}>
        {props.renderItems(items, selectedIndex, executeItem)}
        {items.length === 0 && props.loadingState !== "loading-initial" && (
          <Menu.Item>No match found</Menu.Item>
        )}
        {loader}
      </Menu.Dropdown>
    </Menu>
  );
}
