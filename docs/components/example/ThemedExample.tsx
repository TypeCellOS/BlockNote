"use client";
import { BlockNoteContext } from "@blocknote/react";
import { useTheme } from "nextra-theme-docs";
import { examples } from "./generated/exampleComponents.gen";

export default function ThemedExample(props: { name: keyof typeof examples }) {
  const example = examples[props.name];
  const App = example.App;
  const { resolvedTheme } = useTheme();

  return (
    <BlockNoteContext.Provider
      value={{ colorSchemePreference: resolvedTheme === "dark" ? "dark" : "light" }}>
      <App />
    </BlockNoteContext.Provider>
  );
}
