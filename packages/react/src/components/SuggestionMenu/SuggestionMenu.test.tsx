/* eslint-disable @typescript-eslint/no-unused-vars */
import { it } from "vitest";
import { SuggestionMenuController } from "./SuggestionMenuController";

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
      onItemClick={(item) => {
        // eslint-disable-next-line no-console
        console.log(item.hello);
      }}
      triggerCharacter="/"
    />
  );

  // prevent typescript unused error
  // eslint-disable-next-line no-console
  console.log("menu", menu);
});
