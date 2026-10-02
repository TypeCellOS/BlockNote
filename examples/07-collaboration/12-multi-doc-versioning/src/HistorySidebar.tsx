import { VersioningSidebar } from "@blocknote/react/versioning";
import {
  ActionIcon,
  createTheme,
  type CSSVariablesResolver,
  MantineProvider,
  Text,
  useComputedColorScheme,
} from "@mantine/core";

const historyTheme = createTheme({
  white: "var(--text)",
  primaryColor: "history",
  primaryShade: 6,
  colors: {
    history: [
      "var(--bg-elevated)",
      "var(--bg-inset)",
      "var(--bg-hover)",
      "var(--accent)",
      "var(--bg-active)",
      "var(--bg-active)",
      "var(--bg-active)",
      "var(--bg-active)",
      "var(--bg-hover)",
      "var(--bg-hover)",
    ],
  },
  components: {
    // Selected version metadata and menu buttons otherwise hardcode white.
    Text: Text.extend({ styles: { root: { color: "inherit" } } }),
    ActionIcon: ActionIcon.extend({
      styles: { root: { color: "var(--text)" } },
    }),
  },
});

function historyVariables(): ReturnType<CSSVariablesResolver> {
  const colors = {
    "--mantine-color-body": "var(--bg-elevated)",
    "--mantine-color-text": "var(--text)",
    "--mantine-color-dimmed": "var(--text-subtle)",
    "--mantine-color-default-hover": "var(--bg-hover)",
  };
  return { variables: {}, light: colors, dark: colors };
}

export function HistorySidebar({ onClose }: { onClose: () => void }) {
  const colorScheme = useComputedColorScheme("light");

  return (
    <MantineProvider
      theme={historyTheme}
      cssVariablesResolver={historyVariables}
      cssVariablesSelector=".app-shell .history-sidebar"
      forceColorScheme={colorScheme}
      getRootElement={() => undefined}
      withGlobalClasses={false}
    >
      <aside
        className="history-sidebar"
        data-mantine-color-scheme={colorScheme}
      >
        <div className="history-content">
          {/* VersioningSidebar renders its own "History" header (with the close
              button when `onClose` is passed), so no extra title is needed here. */}
          <VersioningSidebar onClose={onClose} />
        </div>
      </aside>
    </MantineProvider>
  );
}
