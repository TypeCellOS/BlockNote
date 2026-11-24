import { assertType, expect, expectTypeOf, it } from "vite-plus/test";
import { getSuggestionMenuItemId } from "./getSuggestionMenuItemId.js";
import type { SuggestionMenuController } from "./SuggestionMenuController.js";

type MenuProps<GetItems extends (query: string) => Promise<unknown[]>> =
  Parameters<typeof SuggestionMenuController<GetItems>>[0];

it("requires a custom renderer only for custom suggestion items", () => {
  const getDefaultItems = async () => [
    { title: "hello", onItemClick: () => undefined },
  ];
  assertType<MenuProps<typeof getDefaultItems>>({
    getItems: getDefaultItems,
    triggerCharacter: "/",
  });

  const getCustomItems = async () => [{ name: "hello" }];
  const customProps = {
    getItems: getCustomItems,
    triggerCharacter: "/",
  };
  // @ts-expect-error Custom items require a custom renderer.
  assertType<MenuProps<typeof getCustomItems>>({
    ...customProps,
    onItemClick: () => undefined,
  });
  assertType<MenuProps<typeof getCustomItems>>({
    ...customProps,
    suggestionMenuComponent: () => null,
    onItemClick: (item) => {
      expectTypeOf(item).toEqualTypeOf<{ name: string }>();
    },
  });
});

it("returns an active descendant id for the first suggestion", () => {
  expect(getSuggestionMenuItemId(0)).toBe("bn-suggestion-menu-item-0");
  expect(getSuggestionMenuItemId(2)).toBe("bn-suggestion-menu-item-2");
  expect(getSuggestionMenuItemId(undefined)).toBeUndefined();
});
