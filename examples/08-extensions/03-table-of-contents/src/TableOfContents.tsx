import type { BlockNoteEditor } from "@blocknote/core";
import { TableOfContentsExtension } from "@blocknote/core/extensions";
import {
  useExtension,
  useExtensionState,
  usePrefersColorScheme,
} from "@blocknote/react";
import { MantineProvider, NavLink, Text } from "@mantine/core";

/**
 * Example-only UI: an outline of the editor's headings, built with Mantine on
 * top of `TableOfContentsExtension`. Clicking an entry scrolls to its heading.
 */
export function TableOfContents({
  editor,
}: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  const { scrollToEntry } = useExtension(TableOfContentsExtension, { editor });
  const { entries } = useExtensionState(TableOfContentsExtension, { editor });
  const colorScheme = usePrefersColorScheme() === "dark" ? "dark" : "light";

  if (entries.length === 0) {
    return null;
  }

  return (
    <MantineProvider
      cssVariablesSelector=".table-of-contents"
      deduplicateCssVariables={false}
      forceColorScheme={colorScheme}
      getRootElement={() => undefined}
      withGlobalClasses={false}
    >
      <nav
        className="table-of-contents"
        aria-label="Contents"
        data-mantine-color-scheme={colorScheme}
      >
        <Text size="xs" fw={600} c="dimmed" mb={8} pl={12}>
          Contents
        </Text>
        {entries.map((entry) => (
          <NavLink
            key={entry.blockId}
            component="button"
            label={entry.title}
            pl={12 + entry.depth * 12}
            onClick={() => scrollToEntry(entry.blockId)}
          />
        ))}
      </nav>
    </MantineProvider>
  );
}
