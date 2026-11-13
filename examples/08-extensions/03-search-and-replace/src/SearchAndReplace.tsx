import type { BlockNoteEditor } from "@blocknote/core";
import { SearchAndReplaceExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteContext,
  useExtensionState,
  usePrefersColorScheme,
} from "@blocknote/react";
import {
  ActionIcon,
  Button,
  CloseButton,
  Group,
  MantineProvider,
  Paper,
  Text,
  TextInput,
} from "@mantine/core";
import { type ReactNode, useCallback, useId, useRef, useState } from "react";

const navigationButtons = [
  {
    direction: "previous",
    label: "Previous match (Shift+Enter)",
    path: "M8 13V3m-5 5 5-5 5 5",
  },
  {
    direction: "next",
    label: "Next match (Enter)",
    path: "M8 3v10m-5-5 5 5 5-5",
  },
] as const;

/** Example-only UI: wrap an editor view to scope shortcuts to that editor. */
export function SearchAndReplace({
  editor,
  children,
}: {
  editor: BlockNoteEditor;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const search = editor.getExtension(SearchAndReplaceExtension)!;
  const { query, matches, currentIndex } = useExtensionState(
    SearchAndReplaceExtension,
    { editor },
  );
  const searchTerm = query?.searchTerm ?? "";
  const caseSensitive = query?.caseSensitive ?? false;
  const [showReplace, setShowReplace] = useState(false);
  const [replacement, setReplacement] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const replaceId = useId();
  const context = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();
  const colorScheme =
    context?.colorSchemePreference ||
    (systemColorScheme === "dark" ? "dark" : "light");

  const panelRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }
      // Treat this sibling of BlockNoteView as editor UI for focus handling.
      editor.registerPortalElement(element);
      return () => editor.unregisterPortalElement(element);
    },
    [editor],
  );

  function openSearch() {
    setOpen(true);
    searchInput.current?.focus();
    searchInput.current?.select();
  }

  function closeSearch() {
    search.clearSearch();
    setOpen(false);
    editor.focus();
  }

  function navigate(direction: "next" | "previous") {
    if (direction === "next") {
      search.nextMatch();
    } else {
      search.previousMatch();
    }
    // Navigation must not move keyboard focus into the document.
    searchInput.current?.focus();
  }

  return (
    <MantineProvider
      cssVariablesSelector=".search-and-replace-example"
      deduplicateCssVariables={false}
      forceColorScheme={colorScheme}
      getRootElement={() => undefined}
      withGlobalClasses={false}
    >
      <div
        className="search-and-replace-example"
        data-mantine-color-scheme={colorScheme}
        data-search-state={
          open ? (showReplace ? "replace" : "search") : "closed"
        }
        onKeyDownCapture={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            !event.altKey &&
            event.key.toLowerCase() === "f"
          ) {
            event.preventDefault();
            event.stopPropagation();
            openSearch();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            closeSearch();
          }
        }}
      >
        {open ? (
          <Paper
            className="search-overlay"
            ref={panelRef}
            role="search"
            aria-label="Find and replace"
            withBorder
            radius="lg"
            shadow="lg"
            p={8}
          >
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                size={24}
                aria-label={
                  showReplace
                    ? "Hide replacement controls"
                    : "Show replacement controls"
                }
                aria-expanded={showReplace}
                aria-controls={replaceId}
                onClick={() => setShowReplace(!showReplace)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d={showReplace ? "m4 6 4 4 4-4" : "m6 4 4 4-4 4"} />
                </svg>
              </ActionIcon>
              <TextInput
                ref={searchInput}
                autoFocus
                size="xs"
                flex={1}
                miw={0}
                aria-label="Find in document"
                placeholder="Find"
                rightSectionWidth={72}
                rightSectionPointerEvents="none"
                rightSection={
                  <Text
                    component="output"
                    size="xs"
                    c="dimmed"
                    aria-live="polite"
                    aria-atomic="true"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {searchTerm
                      ? matches.length === 0
                        ? "No matches"
                        : `${currentIndex === null ? 0 : currentIndex + 1} of ${matches.length}`
                      : ""}
                  </Text>
                }
                value={searchTerm}
                onChange={(event) =>
                  search.setQuery({
                    searchTerm: event.target.value,
                    caseSensitive,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    navigate(event.shiftKey ? "previous" : "next");
                  }
                }}
              />
              <ActionIcon
                type="button"
                variant={caseSensitive ? "light" : "subtle"}
                color={caseSensitive ? undefined : "gray"}
                size={26}
                aria-label="Match case"
                aria-pressed={caseSensitive}
                title="Match case"
                onClick={() =>
                  search.setQuery({ searchTerm, caseSensitive: !caseSensitive })
                }
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>Aa</span>
              </ActionIcon>
              {navigationButtons.map(({ direction, label, path }) => (
                <ActionIcon
                  key={direction}
                  type="button"
                  variant="subtle"
                  color="gray"
                  size={24}
                  aria-label={label}
                  disabled={matches.length === 0}
                  onClick={() => navigate(direction)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d={path} />
                  </svg>
                </ActionIcon>
              ))}
              <CloseButton
                type="button"
                size={24}
                aria-label="Close search (Escape)"
                onClick={closeSearch}
              />
            </Group>
            {showReplace && (
              <Group gap={4} mt={6} pl={28} wrap="nowrap" id={replaceId}>
                <TextInput
                  size="xs"
                  flex={1}
                  miw={0}
                  aria-label="Replace with"
                  placeholder="Replace with"
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      search.replace(replacement);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="subtle"
                  color="gray"
                  size="xs"
                  px={8}
                  fw={500}
                  disabled={currentIndex === null}
                  onClick={() => search.replace(replacement)}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="subtle"
                  color="gray"
                  size="xs"
                  px={8}
                  fw={500}
                  disabled={matches.length === 0}
                  onClick={() => search.replaceAll(replacement)}
                >
                  Replace all
                </Button>
              </Group>
            )}
          </Paper>
        ) : (
          <div className="search-launcher">
            <Button
              type="button"
              variant="default"
              size="xs"
              title="Find (Cmd/Ctrl+F inside the editor)"
              onClick={openSearch}
            >
              Find
            </Button>
          </div>
        )}
        {children}
      </div>
    </MantineProvider>
  );
}
