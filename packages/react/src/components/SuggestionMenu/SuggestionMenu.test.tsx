import { expect, it } from "vite-plus/test";
import { getSuggestionMenuItemId } from "./getSuggestionMenuItemId.js";
import { SuggestionMenuController } from "./SuggestionMenuController.js";

it("has good typing", () => {
  // invalid, because DefaultSuggestionItem doesn't have a title property, so the default MantineSuggestionMenu doesn't wrok
  let menu = (
    // @ts-expect-error
    <SuggestionMenuController
      getItems={async () => [{ name: "hello" }]}
      triggerCharacter="/"
    />
  );

  // valid, because getItems returns DefaultSuggestionItem so suggestionMenuComponent is optional
  menu = (
    <SuggestionMenuController
      getItems={async () => [
        {
          title: "hello",
          onItemClick: () => {
            return;
          },
        },
      ]}
      triggerCharacter="/"
    />
  );

  // validate type of onItemClick
  menu = (
    <SuggestionMenuController
      suggestionMenuComponent={undefined as any}
      getItems={async () => [{ hello: "hello" }]}
      onItemClick={() => {
        return undefined;
      }}
      triggerCharacter="/"
    />
  );

  expect(menu).toBeDefined();
});

it("returns an active descendant id for the first suggestion", () => {
  expect(getSuggestionMenuItemId(0)).toBe("bn-suggestion-menu-item-0");
  expect(getSuggestionMenuItemId(2)).toBe("bn-suggestion-menu-item-2");
  expect(getSuggestionMenuItemId(undefined)).toBeUndefined();
});
