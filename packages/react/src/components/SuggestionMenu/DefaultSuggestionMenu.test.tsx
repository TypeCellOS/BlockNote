/* eslint-disable @typescript-eslint/no-unused-vars */
import { it } from "vitest";
import { DefaultPositionedSuggestionMenu } from "./DefaultPositionedSuggestionMenu";

it("has good typing", () => {
  // invalid, because DefaultSuggestionItem doesn't have a title property, so the default MantineSuggestionMenu doesn't wrok
  let menu = (
    // @ts-expect-error
    <DefaultPositionedSuggestionMenu
      getItems={async () => [{ name: "hello" }]}
      editor={undefined as any}
      triggerCharacter="/"
    />
  );

  // valid, because getItems returns DefaultSuggestionItem so suggestionMenuComponent is optional
  menu = (
    <DefaultPositionedSuggestionMenu
      getItems={async () => [{ title: "hello" }]}
      editor={undefined as any}
      triggerCharacter="/"
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
      triggerCharacter="/"
    />
  );

  // prevent typescript unused error
  console.log("menu", menu);
});
