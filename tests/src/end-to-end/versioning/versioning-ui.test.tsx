import { BlockNoteView as AriakitBlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import {
  VersioningExtension,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { BlockNoteView as MantineBlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { BlockNoteViewEditor, useCreateBlockNote } from "@blocknote/react";
import { VersioningSidebar } from "@blocknote/react/versioning";
import { BlockNoteView as ShadcnBlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@examples/01-basic/09-shadcn/tailwind.css";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { userEvent } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";
import { clickAt, getRect } from "../../utils/mouse.js";

const CURRENT: VersionSnapshot = {
  id: "current",
  createdAt: Date.UTC(2024, 0, 4),
};
const SNAPSHOTS: VersionSnapshot[] = [
  { id: "named", createdAt: Date.UTC(2024, 0, 3), name: "Draft" },
  { id: "automatic", createdAt: Date.UTC(2024, 0, 2) },
];

type Skin = "mantine" | "ariakit" | "shadcn";
type Theme = "light" | "dark";

function createEndpoints(): VersioningEndpoints {
  return {
    list: async () => ({ current: CURRENT, snapshots: SNAPSHOTS }),
    getContent: async () => [],
    getAttributions: async () => undefined,
    create: async (_document, options) => ({ ...CURRENT, ...options }),
    rename: async () => {},
    remove: async () => {},
    restore: async () => [],
  };
}

function SkinPanel(props: {
  skin: Skin;
  theme: Theme;
  clippingEditorPanel?: boolean;
}) {
  const editor = useCreateBlockNote({
    extensions: [
      VersioningExtension({
        endpoints: createEndpoints(),
        preview: {
          enterPreview: () => {},
          exitPreview: () => {},
          applyRestore: () => {},
        },
        getCurrentDocument: () => [],
        serializeCurrentContent: () => [],
      }),
    ],
  });
  const sidebar = <VersioningSidebar onClose={() => {}} />;
  const content = props.clippingEditorPanel ? (
    <div style={{ display: "flex", height: "100%", width: 620 }}>
      <div
        data-test="clipping-editor-panel"
        style={{ flex: 1, minWidth: 0, overflow: "auto", position: "relative" }}
      >
        <BlockNoteViewEditor />
      </div>
      <div style={{ flex: "0 0 300px", minWidth: 0 }}>{sidebar}</div>
    </div>
  ) : (
    sidebar
  );
  const panelStyle = {
    background: props.theme === "dark" ? "#18181b" : "#ffffff",
    border: "1px solid #a1a1aa",
    borderRadius: 8,
    height: 350,
    overflow: "hidden",
  };
  const view =
    props.skin === "mantine" ? (
      <MantineBlockNoteView
        className="versioning-test-view"
        editor={editor}
        renderEditor={!props.clippingEditorPanel}
        theme={props.theme}
      >
        {content}
      </MantineBlockNoteView>
    ) : props.skin === "ariakit" ? (
      <AriakitBlockNoteView
        className="versioning-test-view"
        editor={editor}
        renderEditor={!props.clippingEditorPanel}
        theme={props.theme}
      >
        {content}
      </AriakitBlockNoteView>
    ) : (
      <ShadcnBlockNoteView
        className="versioning-test-view"
        editor={editor}
        renderEditor={!props.clippingEditorPanel}
        theme={props.theme}
      >
        {content}
      </ShadcnBlockNoteView>
    );

  return (
    <section
      aria-label={`${props.skin} ${props.theme}`}
      className={
        props.skin !== "mantine" && props.theme === "dark" ? "dark" : undefined
      }
      style={panelStyle}
    >
      <style>{`.versioning-test-view .bn-editor { display: none; }`}</style>
      {view}
    </section>
  );
}

function VersioningSkinMatrix() {
  return (
    <main
      data-test="versioning-skin-matrix"
      style={{
        background: "#d4d4d8",
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(3, 300px)",
        padding: 12,
        width: "fit-content",
      }}
    >
      {(["mantine", "ariakit", "shadcn"] as const).flatMap((skin) =>
        (["light", "dark"] as const).map((theme) => (
          <SkinPanel key={`${skin}-${theme}`} skin={skin} theme={theme} />
        )),
      )}
    </main>
  );
}

async function waitForRows(root: ParentNode) {
  return vi.waitFor(() => {
    const rows = root.querySelectorAll<HTMLElement>('[role="listitem"]');
    if (rows.length !== 3) {
      throw new Error(`Expected 3 version rows, found ${rows.length}`);
    }
    return Array.from(rows);
  });
}

async function clickElement(element: Element) {
  const { x, y, width, height } = getRect(element);
  await clickAt(x + width / 2, y + height / 2);
}

test("renders every versioning skin in light and dark themes", async () => {
  await render(<VersioningSkinMatrix />);
  await vi.waitFor(() => {
    expect(
      document.querySelectorAll('[role="region"][aria-label="History"]'),
    ).toHaveLength(6);
  });

  const matrix = document.querySelector<HTMLElement>(
    '[data-test="versioning-skin-matrix"]',
  )!;
  await expectElement(matrix).toMatchScreenshot("versioning-skins-light-dark");
});

test.each(
  (["mantine", "ariakit", "shadcn"] as const).flatMap((skin) =>
    (["light", "dark"] as const).map((theme) => ({ skin, theme })),
  ),
)(
  "renders the $skin $theme row menu outside the clipping editor panel",
  async ({ skin, theme }) => {
    await render(
      <SkinPanel skin={skin} theme={theme} clippingEditorPanel={true} />,
    );
    const panel = document.querySelector<HTMLElement>(
      `[aria-label="${skin} ${theme}"]`,
    )!;
    const rows = await waitForRows(panel);

    await userEvent.hover(rows[2]!);
    const menuButton = rows[2]!.querySelector<HTMLButtonElement>(
      'button[aria-label="More actions"]',
    )!;
    await clickElement(menuButton);
    const menu = await vi.waitFor(() => {
      const element = document.querySelector<HTMLElement>('[role="menu"]');
      if (!element) {
        throw new Error("Expected the version menu to open");
      }
      return element;
    });

    const clippingEditorPanel = panel.querySelector<HTMLElement>(
      '[data-test="clipping-editor-panel"]',
    )!;
    expect(clippingEditorPanel.contains(menu)).toBe(false);
    // Ariakit's generated portal IDs contain a slash, which the browser test
    // element locator cannot turn back into a valid CSS selector.
    menu.id = "versioning-menu-screenshot";
    for (
      let ancestor = menu.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (ancestor.id.includes("/")) {
        ancestor.removeAttribute("id");
      }
    }
    await expectElement(menu).toMatchScreenshot(
      `versioning-${skin}-${theme}-menu-open`,
    );
  },
);

test.each(["mantine", "ariakit", "shadcn"] as const)(
  "%s keeps keyboard navigation and row menus working",
  async (skin) => {
    await render(<SkinPanel skin={skin} theme="light" />);
    const region = document.querySelector<HTMLElement>(
      '[role="region"][aria-label="History"]',
    )!;
    const rows = await waitForRows(region);

    rows[0]!.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await vi.waitFor(() =>
      expect(rows[1]).toHaveAttribute("aria-current", "true"),
    );

    await userEvent.hover(rows[1]!);
    const selectedMenuButton = rows[1]!.querySelector<HTMLButtonElement>(
      'button[aria-label="More actions"]',
    )!;
    await clickElement(selectedMenuButton);
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Restore"),
    );
    expect(document.body.textContent).not.toContain(
      "Compare with this version",
    );

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain("Restore"),
    );
    await userEvent.hover(rows[2]!);
    const otherMenuButton = rows[2]!.querySelector<HTMLButtonElement>(
      'button[aria-label="More actions"]',
    )!;
    await clickElement(otherMenuButton);
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Compare with this version"),
    );
  },
);
