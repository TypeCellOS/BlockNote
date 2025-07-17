import { expect, it } from "vitest";
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
