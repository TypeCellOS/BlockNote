"use client";

import { BlockNoteContext } from "@blocknote/react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

export default function ThemedExample(props: { name: string }) {
  const Component = dynamic(
    () => import("./example/generated/components/" + props.name + "/index"),
    { ssr: false },
  );

  const { resolvedTheme } = useTheme();

  return (
    <BlockNoteContext.Provider
      value={{
        colorSchemePreference: resolvedTheme === "dark" ? "dark" : "light",
      }}
    >
      <Component />
    </BlockNoteContext.Provider>
  );
}
