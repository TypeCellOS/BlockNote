/* eslint-disable @typescript-eslint/no-unused-vars */
import { it } from "vitest";
import { DefaultPositionedSuggestionMenu } from "./DefaultSuggestionMenu";

it("has good typing", () => {
  // invalid, because DefaultSuggestionItem doesn't have a title property, so the default MantineSuggestionMenu doesn't wrok
  let menu = (
    // @ts-expect-error
    <DefaultPositionedSuggestionMenu
      getItems={async () => [{ name: "hello" }]}
      editor={undefined as any}
    />
  );

  // valid, because getItems returns DefaultSuggestionItem so suggestionMenuComponent is optional
  menu = (
    <DefaultPositionedSuggestionMenu
      getItems={async () => [{ title: "hello" }]}
      editor={undefined as any}
    />
  );

  // validate type of onItemClick
  menu = (
    <DefaultPositionedSuggestionMenu
      suggestionMenuComponent={undefined as any}
      getItems={async () => [{ hello: "hello" }]}
      editor={undefined as any}
      onItemClick={(item) => {
        console.log(item.hello);
      }}
    />
  );
});
