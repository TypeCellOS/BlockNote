"use client";
import { BlockNoteContext } from "@blocknote/react";
import { useTheme } from "nextra-theme-docs";
import { examples } from "./generated/exampleComponents.gen";

export default function ThemedExample(props: { name: keyof typeof examples }) {
  const example = examples[props.name];
  const App = example.App;
  const { theme } = useTheme();

  return (
    <BlockNoteContext.Provider
      value={{ colorSchemePreference: theme === "dark" ? "dark" : "light" }}>
      <App />
    </BlockNoteContext.Provider>
  );
}
