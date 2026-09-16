import { StrictMode, type ComponentType, type ReactNode } from "react";
import { BlockNoteView as AriakitBlockNoteView } from "@blocknote/ariakit";
import { BlockNoteView as ShadcnBlockNoteView } from "@blocknote/shadcn";
import { BlockNoteEditor } from "@blocknote/core";
import {
  VersioningExtension,
  type VersioningEndpoints,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  DefaultVersionMenuItems,
  RestoreVersionItem,
  useRestoreVersionAction,
  usePreviewRow,
  useVersionSnapshot,
  VersioningSidebar,
  VersionMenu,
  VersionMenuItem,
} from "@blocknote/react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CURRENT: VersionSnapshot = { id: "now", createdAt: 3000 };
const NAMED: VersionSnapshot = { id: "b", createdAt: 2000, name: "Draft" };
const AUTOMATIC: VersionSnapshot = { id: "a", createdAt: 1000 };

/**
 * Fake endpoints with spies on every verb, plus a gate that holds `list` and
 * `getContent` open so the loading states can be observed.
 */
function createFakeEndpoints() {
  let current = CURRENT;
  let snapshots = [NAMED, AUTOMATIC];

  let gate: { promise: Promise<void>; release: () => void } | undefined;

  const endpoints = {
    list: vi.fn(async () => {
      await gate?.promise;
      return { current, snapshots };
    }),
    getContent: vi.fn(async () => {
      await gate?.promise;
      return [];
    }),
    getAttributions: vi.fn(async () => undefined),
    create: vi.fn(async (_doc: unknown, options: { name?: string }) => {
      current = { ...current, name: options.name };
      return current;
    }),
    rename: vi.fn(async (snapshot: VersionSnapshot, name?: string) => {
      snapshots = snapshots.map((s) =>
        s.id === snapshot.id ? { ...s, name } : s,
      );
      if (snapshot.id === current.id) {
        current = { ...current, name };
      }
    }),
    remove: vi.fn(async (snapshot: VersionSnapshot) => {
      snapshots = snapshots.filter((s) => s.id !== snapshot.id);
    }),
    restore: vi.fn(async () => []),
  } satisfies VersioningEndpoints;

  return {
    endpoints,
    /** Hold every async endpoint open until the returned callback is called. */
    block() {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      gate = { promise, release };
      return () => {
        gate = undefined;
        release();
      };
    },
    /** Mutate the backend behind the sidebar's back (as a peer would). */
    setSnapshots(next: VersionSnapshot[]) {
      snapshots = next;
    },
  };
}

function createEditor(endpoints: VersioningEndpoints) {
  return BlockNoteEditor.create({
    extensions: [
      VersioningExtension({
        endpoints,
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
}

/** Render the sidebar inside a real editor and wait for its initial list. */
async function setup(
  props: Parameters<typeof VersioningSidebar>[0] = {},
  fake = createFakeEndpoints(),
  View: ComponentType<{
    editor: ReturnType<typeof createEditor>;
    children: ReactNode;
  }> = BlockNoteView,
) {
  const editor = createEditor(fake.endpoints);
  const view = render(
    <View editor={editor}>
      <VersioningSidebar {...props} />
    </View>,
  );
  // Let the mount effect's `list()` + initial preview settle.
  await act(async () => {});
  return { editor, fake, view };
}

function rows() {
  return screen.getAllByRole("listitem");
}

/**
 * A row's name field. Only the selected row has one — every other row shows
 * its name as text (see {@link nameText}).
 */
function nameInput(row: HTMLElement) {
  return within(row).getByRole("textbox", {
    name: "Version name",
  }) as HTMLInputElement;
}

/** What a row shows as its name: the field's value, or the text. */
function nameText(row: HTMLElement) {
  const input = within(row).queryByRole("textbox", { name: "Version name" });
  if (input) {
    return (input as HTMLInputElement).value;
  }
  return row.querySelector(".bn-snapshot-name")!.textContent;
}

/**
 * Click, then let everything the click kicked off settle — including the
 * timer-driven mount of a Mantine menu dropdown, which a microtask flush alone
 * doesn't cover.
 */
async function click(element: Element) {
  fireEvent.click(element);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

/**
 * Retry `get` until it stops throwing. Menus and their contents mount on
 * timers, so a single flush is not always enough.
 */
async function eventually<T>(get: () => T): Promise<T> {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return get();
    } catch {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }
  return get();
}

/**
 * Open the row's "..." menu and return the item matching `label`, retrying
 * until the dropdown is there — it mounts on a timer, so under load a click can
 * land while the menu is still opening and do nothing at all.
 */
async function openMenuItem(row: HTMLElement, label: RegExp) {
  // Scoped to this row: the dropdown isn't portaled, and a document-wide
  // query could pick up another row's menu if one were still open.
  const item = () => within(row).queryAllByText(label)[0];

  for (let attempt = 0; attempt < 10 && !item(); attempt++) {
    const trigger = within(row).getByRole("button", {
      name: "More actions",
    });
    if (trigger.getAttribute("aria-expanded") !== "true") {
      await click(trigger);
    } else {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  const found = item();
  if (!found) {
    throw new Error(`the row's ${label} menu item never appeared`);
  }
  return found;
}

/** Type `value` into a name field and end the edit with `key`. */
async function commit(input: HTMLInputElement, value: string, key: string) {
  input.focus();
  fireEvent.change(input, { target: { value } });
  // Both keys leave the field, and leaving it is what commits.
  fireEvent.keyDown(input, { key });
  await act(async () => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VersioningSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens on the current version with the editor locked, and unlocks on unmount", async () => {
    const { editor, view } = await setup();

    expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
    expect(nameInput(rows()[0]!).placeholder).toBe("Current version");
    expect(editor.isEditable).toBe(false);

    view.unmount();
    expect(editor.isEditable).toBe(true);
  });

  it("opens and closes preview through Strict Mode effect cleanup", async () => {
    const editor = createEditor(createFakeEndpoints().endpoints);
    const view = render(
      <StrictMode>
        <BlockNoteView editor={editor}>
          <VersioningSidebar />
        </BlockNoteView>
      </StrictMode>,
    );
    await act(async () => {});
    expect(
      editor.getExtension(VersioningExtension)!.store.state.view.mode,
    ).toBe("current");
    expect(editor.isEditable).toBe(false);
    view.unmount();
    expect(
      editor.getExtension(VersioningExtension)!.store.state.view.mode,
    ).toBe("live");
    expect(editor.isEditable).toBe(true);
  });

  it("lists the current version first, then stored versions newest-first", async () => {
    await setup();

    expect(rows()).toHaveLength(3);
    expect(nameText(rows()[1]!)).toBe("Draft");
  });

  it("shows a name field on the selected row only", async () => {
    await setup();

    // Opens on the current row, so that's the one with a field.
    expect(nameInput(rows()[0]!)).toBeDefined();
    expect(
      within(rows()[1]!).queryByRole("textbox", { name: "Version name" }),
    ).toBeNull();
    expect(nameText(rows()[1]!)).toBe("Draft");

    // The first click selects; the name is text until then.
    await click(rows()[1]!);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(nameInput(rows()[1]!).value).toBe("Draft");
    expect(
      within(rows()[0]!).queryByRole("textbox", { name: "Version name" }),
    ).toBeNull();
  });

  it("doesn't reselect the row when its name field is clicked", async () => {
    const { fake } = await setup();

    await click(rows()[2]!);
    fake.endpoints.getContent.mockClear();

    await click(nameInput(rows()[2]!));

    expect(fake.endpoints.getContent).not.toHaveBeenCalled();
  });

  it("filters to named versions, keeping the current row", async () => {
    await setup();

    await click(
      screen.getByRole("button", { name: "Show named versions only" }),
    );

    // The current row survives the filter; the unnamed one doesn't.
    expect(rows()).toHaveLength(2);
    expect(nameText(rows()[1]!)).toBe("Draft");

    await click(screen.getByRole("button", { name: "Show all versions" }));
    expect(rows()).toHaveLength(3);
  });

  it("starts filtered when asked to", async () => {
    await setup({ defaultNamedOnly: true });

    expect(rows()).toHaveLength(2);
  });

  it("says no named versions when the filter hides everything", async () => {
    const fake = createFakeEndpoints();
    fake.setSnapshots([AUTOMATIC]);
    await setup({}, fake);

    await click(
      screen.getByRole("button", { name: "Show named versions only" }),
    );

    expect(screen.getByText("No named versions")).toBeDefined();
  });

  it("says no versions yet when nothing is stored", async () => {
    const fake = createFakeEndpoints();
    fake.setSnapshots([]);
    await setup({}, fake);

    expect(screen.getByText("No versions yet")).toBeDefined();
  });

  it("starts with comparison off and turns it on with a baseline", async () => {
    const { editor } = await setup();

    const versioning = editor.getExtension(VersioningExtension)!;
    expect(versioning.store.state.view).toEqual({
      mode: "current",
      compareToId: undefined,
    });

    await click(screen.getByRole("button", { name: "Turn on comparison" }));
    await act(async () => {});

    // The current version is diffed against the newest stored version.
    expect(versioning.store.state.view).toEqual({
      mode: "current",
      compareToId: NAMED.id,
    });
  });

  it("does not compare a row excluded from the requested filter against the newest snapshot", async () => {
    function PreviewNamedHistoryItem() {
      const { snapshot } = useVersionSnapshot();
      const previewRow = usePreviewRow();
      return (
        <VersionMenuItem
          onClick={() =>
            previewRow(snapshot, {
              namedOnly: true,
              compareTo: { type: "previous" },
            })
          }
        >
          Preview named history
        </VersionMenuItem>
      );
    }
    const { editor } = await setup({
      snapshotMenu: (
        <VersionMenu>
          <PreviewNamedHistoryItem />
        </VersionMenu>
      ),
    });
    await click(await openMenuItem(rows()[2]!, /^Preview named history$/));
    expect(
      editor.getExtension(VersioningExtension)!.store.state.view,
    ).toMatchObject({
      mode: "snapshot",
      snapshotId: AUTOMATIC.id,
      compareToId: undefined,
    });
  });

  it.each([false, true])(
    "compares visible named versions (initial comparison: %s)",
    async (initialComparison) => {
      const fake = createFakeEndpoints();
      const olderNamed = { id: "older", createdAt: 500, name: "First draft" };
      fake.setSnapshots([
        { id: "recent-auto", createdAt: 2500 },
        NAMED,
        AUTOMATIC,
        olderNamed,
        { id: "oldest-auto", createdAt: 100 },
      ]);
      const { editor } = await setup(
        {
          defaultNamedOnly: initialComparison,
          defaultComparisonMode: initialComparison,
        },
        fake,
      );
      if (!initialComparison) {
        await click(
          screen.getByRole("button", { name: "Show named versions only" }),
        );
        await click(screen.getByRole("button", { name: "Turn on comparison" }));
      }
      const versioning = editor.getExtension(VersioningExtension)!;
      expect(versioning.store.state.view).toEqual({
        mode: "current",
        compareToId: NAMED.id,
      });
      expect(rows()).toHaveLength(3);
      expect(rows()[1]!.classList.contains("comparing")).toBe(true);
      await click(rows()[1]!);
      expect(versioning.store.state.view).toMatchObject({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: olderNamed.id,
      });
      expect(rows()[2]!.classList.contains("comparing")).toBe(true);
      await click(rows()[2]!);
      expect(versioning.store.state.view).toMatchObject({
        mode: "snapshot",
        snapshotId: olderNamed.id,
        compareToId: undefined,
      });
      expect(document.querySelector(".bn-snapshot.comparing")).toBeNull();
    },
  );

  it.each([0, 1])(
    "clears comparison when showing all versions and keeps selection %s",
    async (selectedIndex) => {
      const fake = createFakeEndpoints();
      const olderNamed = { id: "older", createdAt: 500, name: "First draft" };
      fake.setSnapshots([
        { id: "recent-auto", createdAt: 2500 },
        NAMED,
        AUTOMATIC,
        olderNamed,
      ]);
      const { editor } = await setup(
        { defaultNamedOnly: true, defaultComparisonMode: true },
        fake,
      );
      await click(rows()[selectedIndex]!);
      await click(screen.getByRole("button", { name: "Show all versions" }));

      expect(
        editor.getExtension(VersioningExtension)!.store.state.view,
      ).toEqual(
        selectedIndex === 0
          ? { mode: "current", compareToId: undefined }
          : { mode: "snapshot", snapshotId: NAMED.id, compareToId: undefined },
      );
      expect(rows()).toHaveLength(5);
      expect(screen.queryByText("Comparing to")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Turn on comparison" }),
      ).toBeDefined();
      expect(editor.isEditable).toBe(false);
    },
  );

  it("reports a failed initial preview", async () => {
    const fake = createFakeEndpoints();
    fake.endpoints.getContent.mockRejectedValueOnce(
      new Error("preview offline"),
    );

    await setup({ defaultComparisonMode: true }, fake);

    expect(screen.getByRole("alert").textContent).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("clears comparison when filtering to named versions and keeps a named selection", async () => {
    const { editor } = await setup({ defaultComparisonMode: true });
    await click(rows()[1]!);
    const versioning = editor.getExtension(VersioningExtension)!;
    expect(versioning.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: AUTOMATIC.id,
    });
    expect(rows()[1]!.classList.contains("bn-snapshot-comparison-source")).toBe(
      true,
    );
    expect(rows()[2]!.classList.contains("comparing")).toBe(true);

    await click(
      screen.getByRole("button", { name: "Show named versions only" }),
    );

    expect(versioning.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: undefined,
    });
    expect(rows()).toHaveLength(2);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(rows()[1]!.classList.contains("bn-snapshot-comparison-source")).toBe(
      false,
    );
    expect(screen.queryByText("Comparing to")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Turn on comparison" }),
    ).toBeDefined();

    await click(screen.getByRole("button", { name: "Show all versions" }));
    expect(versioning.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: undefined,
    });
  });

  it("clears an explicit named baseline when entering named-only history", async () => {
    const { editor } = await setup();
    await click(await openMenuItem(rows()[1]!, /^Compare with this version$/));
    await click(
      screen.getByRole("button", { name: "Show named versions only" }),
    );
    expect(editor.getExtension(VersioningExtension)!.store.state.view).toEqual({
      mode: "current",
      compareToId: undefined,
    });
    expect(screen.queryByText("Comparing to")).toBeNull();
  });

  it("returns to Current when named-only history hides the viewed version", async () => {
    const { editor } = await setup({ defaultComparisonMode: true });
    await click(rows()[2]!);
    await click(
      screen.getByRole("button", { name: "Show named versions only" }),
    );
    expect(editor.getExtension(VersioningExtension)!.store.state.view).toEqual({
      mode: "current",
      compareToId: undefined,
    });
    expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
    expect(editor.isEditable).toBe(false);
  });

  it.each(["none", "previous"])(
    "compares against a snapshot whose id is %s",
    async (id) => {
      const fake = createFakeEndpoints();
      fake.setSnapshots([NAMED, { ...AUTOMATIC, id }]);
      const { editor } = await setup({}, fake);

      await click(
        await openMenuItem(rows()[2]!, /^Compare with this version$/),
      );

      expect(
        editor.getExtension(VersioningExtension)!.store.state.view,
      ).toEqual({
        mode: "current",
        compareToId: id,
      });
      expect(fake.endpoints.getContent).toHaveBeenCalledWith(
        expect.objectContaining({ id }),
      );
    },
  );

  it("reports a failed comparison toggle", async () => {
    const { fake } = await setup();
    fake.endpoints.getContent.mockRejectedValueOnce(
      new Error("preview offline"),
    );

    await click(screen.getByRole("button", { name: "Turn on comparison" }));

    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("starts comparing when asked to", async () => {
    const { editor } = await setup({ defaultComparisonMode: true });

    expect(editor.getExtension(VersioningExtension)!.store.state.view).toEqual({
      mode: "current",
      compareToId: NAMED.id,
    });
  });

  it("selects a version when its row is clicked", async () => {
    const { editor } = await setup();

    await click(rows()[2]!);
    await act(async () => {});

    expect(editor.getExtension(VersioningExtension)!.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: AUTOMATIC.id,
      compareToId: undefined,
    });
  });

  // -------------------------------------------------------------------------
  // Renaming
  // -------------------------------------------------------------------------

  describe("naming and renaming", () => {
    const openRenameItem = (row: HTMLElement) =>
      openMenuItem(row, /^(Name this version|Rename)$/);

    it("focuses the name field when started from the menu", async () => {
      await setup();
      // Selected already, so the field is there to focus.
      await click(rows()[1]!);
      const row = rows()[1]!;

      await click(await openRenameItem(row));
      // A tick later than the click: the menu hands focus back to its trigger
      // as it closes, so the row asks for it only once that has happened.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(document.activeElement).toBe(nameInput(row));
    });

    it("selects the row first when started from an unselected row's menu", async () => {
      await setup();
      const row = rows()[2]!;
      expect(row.getAttribute("aria-current")).toBeNull();

      await click(await openRenameItem(row));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(rows()[2]!.getAttribute("aria-current")).toBe("true");
      expect(document.activeElement).toBe(nameInput(rows()[2]!));
    });

    it("names the current version through `create`", async () => {
      const { fake } = await setup();

      await commit(nameInput(rows()[0]!), "Milestone", "Enter");

      expect(fake.endpoints.create).toHaveBeenCalledWith([], {
        name: "Milestone",
      });
      expect(fake.endpoints.rename).not.toHaveBeenCalled();
    });

    it("labels a named current row as the current version", async () => {
      await setup();

      // This backend names the current row in place, so the name takes the
      // title slot and "Current version" moves to where the date was.
      await commit(nameInput(rows()[0]!), "Milestone", "Enter");

      const row = rows()[0]!;
      expect(nameInput(row).value).toBe("Milestone");
      expect(within(row).getByText("Current version")).toBeDefined();
      expect(within(row).queryByText(/2026|1970/)).toBeNull();
    });

    it("clears the field when the name lands on a new version", async () => {
      const fake = createFakeEndpoints();
      // What the in-memory backend does: naming the current version stores a
      // *new* named version and leaves the current row itself unnamed.
      fake.endpoints.create.mockImplementation(async (_doc, options) => {
        const created = { id: "new", createdAt: 2500, name: options.name };
        fake.setSnapshots([created, NAMED, AUTOMATIC]);
        return created;
      });

      await setup({}, fake);
      await commit(nameInput(rows()[0]!), "Milestone", "Enter");

      expect(nameInput(rows()[0]!).value).toBe("");
      expect(nameText(rows()[1]!)).toBe("Milestone");
    });

    it("renames a stored version through `rename`", async () => {
      const { fake } = await setup();

      await click(rows()[1]!);
      await commit(nameInput(rows()[1]!), "Final", "Enter");

      expect(fake.endpoints.rename).toHaveBeenCalledWith(
        expect.objectContaining({ id: NAMED.id }),
        "Final",
      );
      expect(fake.endpoints.create).not.toHaveBeenCalled();
      // Enter commits by moving focus to the row, keeping keyboard
      // navigation in the list rather than dropping focus to the body.
      expect(document.activeElement).toBe(rows()[1]);
    });

    it("cancels on Escape without renaming", async () => {
      const { fake } = await setup();

      await click(rows()[1]!);
      await commit(nameInput(rows()[1]!), "Discarded", "Escape");

      expect(fake.endpoints.rename).not.toHaveBeenCalled();
      expect(nameInput(rows()[1]!).value).toBe("Draft");
    });

    it("clears the name when committed empty", async () => {
      const { fake } = await setup();

      await click(rows()[1]!);
      await commit(nameInput(rows()[1]!), "  ", "Enter");

      expect(fake.endpoints.rename).toHaveBeenCalledWith(
        expect.objectContaining({ id: NAMED.id }),
        undefined,
      );
    });

    it("re-renders when a version is renamed from outside the row", async () => {
      const { editor } = await setup();
      const versioning = editor.getExtension(VersioningExtension)!;

      await act(async () => {
        await versioning.rename!(NAMED.id, "Renamed elsewhere");
      });

      expect(nameText(rows()[1]!)).toBe("Renamed elsewhere");
    });
  });

  // -------------------------------------------------------------------------
  // Menu composition
  // -------------------------------------------------------------------------

  it.each([null, false])(
    "hides the menu and trigger for snapshotMenu=%s",
    async (snapshotMenu) => {
      await setup({ snapshotMenu });
      expect(rows()).toHaveLength(3);
      expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
      await click(rows()[1]!);
      expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    },
  );

  it.each([
    ["Mantine", BlockNoteView],
    ["Ariakit", AriakitBlockNoteView],
    ["Shadcn", ShadcnBlockNoteView],
  ] as const)("prevents disabled custom actions in %s", async (_name, View) => {
    const onClick = vi.fn();
    await setup(
      {
        snapshotMenu: (
          <VersionMenu>
            <VersionMenuItem disabled onClick={onClick}>
              Disabled action
            </VersionMenuItem>
            <VersionMenuItem disabled checked onClick={onClick}>
              Disabled checked action
            </VersionMenuItem>
          </VersionMenu>
        ),
      },
      createFakeEndpoints(),
      View,
    );
    await click(
      within(rows()[1]!).getByRole("button", { name: "More actions" }),
    );
    for (const label of ["Disabled action", "Disabled checked action"]) {
      const item = await eventually(() =>
        screen.getByText(label).closest('[role^="menuitem"]'),
      );
      if (!item) {
        throw new Error("Missing menu item");
      }
      expect(
        item.hasAttribute("disabled") ||
          item.getAttribute("aria-disabled") === "true",
      ).toBe(true);
      await click(item);
    }
    expect(onClick).not.toHaveBeenCalled();
  });

  it("composes the default fragment with extra items", async () => {
    const onClick = vi.fn();
    await setup({
      snapshotMenu: (
        <VersionMenu>
          <DefaultVersionMenuItems />
          <VersionMenuItem onClick={onClick}>Download</VersionMenuItem>
        </VersionMenu>
      ),
    });
    await click(
      within(rows()[1]!).getByRole("button", { name: "More actions" }),
    );
    const download = await openMenuItem(rows()[1]!, /^Download$/);
    expect(screen.getByText("Restore")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
    await click(download);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("reuses restore behavior from a custom item and exposes availability", async () => {
    function CustomRestoreItem() {
      const action = useRestoreVersionAction();
      if (!action.available) {
        return <VersionMenuItem disabled>Cannot restore</VersionMenuItem>;
      }
      return (
        <VersionMenuItem
          onClick={() => {
            void action.execute();
          }}
        >
          Roll back
        </VersionMenuItem>
      );
    }
    const { editor, fake } = await setup({
      snapshotMenu: (
        <VersionMenu>
          <CustomRestoreItem />
        </VersionMenu>
      ),
    });
    await click(
      within(rows()[0]!).getByRole("button", { name: "More actions" }),
    );
    const unavailable = await openMenuItem(rows()[0]!, /^Cannot restore$/);
    await click(unavailable);
    expect(fake.endpoints.restore).not.toHaveBeenCalled();
    // Close the current menu before opening the stored version's menu.
    await click(
      within(rows()[0]!).getByRole("button", { name: "More actions" }),
    );
    await click(rows()[1]!);
    await click(
      within(rows()[1]!).getByRole("button", { name: "More actions" }),
    );
    await click(await openMenuItem(rows()[1]!, /^Roll back$/));
    expect(fake.endpoints.restore).toHaveBeenCalledWith([], NAMED);
    expect(
      editor.getExtension(VersioningExtension)!.store.state.view.mode,
    ).toBe("current");
    expect(editor.isEditable).toBe(false);
  });

  it("customizes a default item's presentation and disables its action", async () => {
    const { fake } = await setup({
      snapshotMenu: (
        <VersionMenu>
          <RestoreVersionItem
            disabled
            className="custom-restore"
            icon={<span>Custom icon</span>}
          >
            Roll back
          </RestoreVersionItem>
        </VersionMenu>
      ),
    });
    await click(
      within(rows()[1]!).getByRole("button", { name: "More actions" }),
    );
    const label = await openMenuItem(rows()[1]!, /^Roll back$/);
    const item = label.closest<HTMLElement>('[role="menuitem"]');
    if (!item) {
      throw new Error("Missing restore item");
    }
    expect(within(item).getByText("Custom icon")).toBeDefined();
    expect(item.classList.contains("bn-menu-item")).toBe(true);
    expect(item.classList.contains("custom-restore")).toBe(true);
    expect(
      item.hasAttribute("disabled") ||
        item.getAttribute("aria-disabled") === "true",
    ).toBe(true);
    await click(item);
    expect(fake.endpoints.restore).not.toHaveBeenCalled();
  });

  it("gives a custom snapshotMenu the row it was rendered in, and drops the defaults", async () => {
    function MakeCopyItem() {
      const { snapshot, isCurrent } = useVersionSnapshot();
      return (
        <VersionMenuItem>
          {isCurrent ? "Copy current" : `Copy ${snapshot.name ?? snapshot.id}`}
        </VersionMenuItem>
      );
    }

    await setup({
      snapshotMenu: (
        <VersionMenu>
          <MakeCopyItem />
        </VersionMenu>
      ),
    });

    await click(
      within(rows()[1]!).getByRole("button", { name: "More actions" }),
    );

    expect(
      await eventually(() => screen.getByText("Copy Draft")),
    ).toBeDefined();
    expect(screen.queryByText("Restore")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  it("moves through the list with the arrow keys and selects with Enter", async () => {
    const { editor } = await setup();

    rows()[0]!.focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows()[1]);

    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(rows()[2]);

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(rows()[0]);

    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    await act(async () => {});

    expect(editor.getExtension(VersioningExtension)!.store.state.view).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: undefined,
    });
  });

  it("keeps a single tab stop for the whole list", async () => {
    await setup();

    expect(rows().map((row) => row.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
    ]);
  });

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  it("shows a status region while the list loads, then the rows", async () => {
    const fake = createFakeEndpoints();
    const release = fake.block();
    const editor = createEditor(fake.endpoints);

    render(
      <BlockNoteView editor={editor}>
        <VersioningSidebar />
      </BlockNoteView>,
    );

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Loading versions")).toBeDefined();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    await act(async () => {
      release();
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(rows()).toHaveLength(3);
  });

  it("keeps the existing rows and selection visible during a refresh", async () => {
    const { editor, fake } = await setup();
    await click(rows()[1]!);
    const selectedRow = rows()[1]!;
    const release = fake.block();
    const versioning = editor.getExtension(VersioningExtension)!;
    let refresh!: ReturnType<typeof versioning.list>;
    act(() => {
      refresh = versioning.list();
    });

    expect(screen.getByRole("list").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
    expect(rows()).toHaveLength(3);
    expect(rows()[1]).toBe(selectedRow);
    expect(selectedRow.getAttribute("aria-current")).toBe("true");
    expect(editor.isEditable).toBe(false);

    fake.setSnapshots([NAMED]);
    await act(async () => {
      release();
      await refresh;
    });
    expect(screen.getByRole("list").getAttribute("aria-busy")).toBeNull();
    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toBe(selectedRow);
    expect(selectedRow.getAttribute("aria-current")).toBe("true");
  });

  it.each(["close", "unmount"])(
    "does not enter preview when the initial list finishes after %s",
    async (exit) => {
      const fake = createFakeEndpoints();
      const release = fake.block();
      const onClose = vi.fn();
      const { editor, view } = await setup({ onClose }, fake);
      expect(screen.getByRole("status")).toBeDefined();

      if (exit === "close") {
        await click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledOnce();
      } else {
        view.rerender(<BlockNoteView editor={editor} />);
      }
      await act(async () => release());
      expect(
        editor.getExtension(VersioningExtension)!.store.state.view,
      ).toEqual({ mode: "live" });
      expect(editor.isEditable).toBe(true);
      expect(fake.endpoints.getContent).not.toHaveBeenCalled();
    },
  );

  it("moves the busy marker to the latest selection while both previews load", async () => {
    const { editor, fake } = await setup();
    const release = fake.block();
    await click(rows()[1]!);
    expect(rows()[1]!.getAttribute("aria-busy")).toBe("true");
    await click(rows()[2]!);
    expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();
    expect(rows()[2]!.getAttribute("aria-busy")).toBe("true");
    expect(rows()[2]!.getAttribute("aria-current")).toBe("true");
    expect(editor.isEditable).toBe(false);

    await act(async () => release());
    expect(rows().every((row) => !row.hasAttribute("aria-busy"))).toBe(true);
    expect(rows()[2]!.getAttribute("aria-current")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears a failed row's busy marker, restores selection, and allows retry", async () => {
    const { fake } = await setup();
    let rejectContent!: (error: Error) => void;
    fake.endpoints.getContent.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectContent = reject;
        }),
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await click(rows()[1]!);
      expect(rows()[1]!.getAttribute("aria-busy")).toBe("true");
      await act(async () => rejectContent(new Error("private backend detail")));
      expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();
      expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
      expect(screen.getByRole("alert").textContent).toBe(
        "Something went wrong. Please try again.",
      );

      await click(rows()[1]!);
      expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
      expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      logged.mockRestore();
    }
  });

  it("marks the row being switched to as busy", async () => {
    const { fake } = await setup();

    const release = fake.block();
    fireEvent.click(rows()[2]!);
    await act(async () => {});

    expect(rows()[2]!.getAttribute("aria-busy")).toBe("true");
    expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();

    await act(async () => {
      release();
    });

    expect(rows()[2]!.getAttribute("aria-busy")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Row actions
  // -------------------------------------------------------------------------

  describe("row actions", () => {
    it("re-selects the current version after deleting the one on screen", async () => {
      const { editor } = await setup();
      const ext = editor.getExtension(VersioningExtension)!;

      await click(rows()[1]!);
      expect(ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: undefined,
      });

      await click(await openMenuItem(rows()[1]!, /^Delete$/));
      await act(async () => {});

      // The panel always has a selection, and the editor stays read-only for
      // as long as it is open.
      expect(ext.store.state.view).toEqual({
        mode: "current",
        compareToId: undefined,
      });
      expect(editor.isEditable).toBe(false);
      expect(rows()).toHaveLength(2);
    });

    it.each([
      ["Restore", "close"],
      ["Restore", "unmount"],
      ["Delete", "close"],
      ["Delete", "unmount"],
    ])(
      "does not reopen preview when %s finishes after %s",
      async (action, exit) => {
        const { editor, fake, view } = await setup({ onClose: vi.fn() });
        await click(rows()[1]!);
        const item = await openMenuItem(rows()[1]!, new RegExp(`^${action}$`));
        // Hold the refresh after the mutation, before its follow-up selection.
        const release = fake.block();
        await click(item);
        if (exit === "close") {
          await click(screen.getByRole("button", { name: "Close" }));
        } else {
          view.rerender(<BlockNoteView editor={editor} />);
        }
        await act(async () => release());

        expect(
          editor.getExtension(VersioningExtension)!.store.state.view,
        ).toEqual({
          mode: "live",
        });
        expect(editor.isEditable).toBe(true);
      },
    );

    it("keeps the selection and reports it when a restore fails", async () => {
      const fake = createFakeEndpoints();
      fake.endpoints.restore.mockRejectedValueOnce(new Error("network"));
      const { editor } = await setup({}, fake);
      const ext = editor.getExtension(VersioningExtension)!;

      await click(rows()[1]!);
      await click(await openMenuItem(rows()[1]!, /^Restore$/));
      await act(async () => {});

      expect(screen.getByRole("alert").textContent).toBe(
        "Something went wrong. Please try again.",
      );
      expect(ext.store.state.view).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: undefined,
      });
      expect(editor.isEditable).toBe(false);

      // The next successful action clears the notice.
      await click(rows()[2]!);
      await act(async () => {});
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("reports a name that the backend rejects", async () => {
      const fake = createFakeEndpoints();
      fake.endpoints.create.mockRejectedValueOnce(new Error("no activity"));
      await setup({}, fake);

      await commit(nameInput(rows()[0]!), "First draft", "Enter");

      expect(screen.getByRole("alert")).toBeDefined();
      expect(nameInput(rows()[0]!).value).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility baseline
  // -------------------------------------------------------------------------

  it("ignores a superseded naming action's failure notice", async () => {
    const { fake } = await setup();
    let rejectName!: (error: Error) => void;
    fake.endpoints.create.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectName = reject;
        }),
    );
    await commit(nameInput(rows()[0]!), "Draft", "Enter");
    await click(rows()[1]!);
    await act(async () => rejectName(new Error("old naming failed")));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([BlockNoteView, AriakitBlockNoteView, ShadcnBlockNoteView])(
    "names the panel, toolbars and focused rows across skins",
    async (View) => {
      await setup({}, createFakeEndpoints(), View);
      expect(screen.getByRole("region", { name: "History" })).toBeDefined();
      expect(screen.getByRole("toolbar", { name: "History" })).toBeDefined();
      expect(rows()[0]!.getAttribute("aria-label")).toContain(
        "Current version",
      );
      expect(rows()[1]!.getAttribute("aria-label")).toContain("Draft");
    },
  );

  it("keeps naming in the tab order when row menus are hidden", async () => {
    await setup({ snapshotMenu: null });
    expect(nameInput(rows()[0]!).tabIndex).toBe(0);
  });

  it("gives multiple sidebars unique row IDs", async () => {
    await setup();
    await setup();
    const ids = rows().map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns keyboard focus to the editor when closing", async () => {
    const { editor } = await setup({ onClose: () => {} });
    await click(screen.getByRole("button", { name: "Close" }));
    expect(editor.domElement!.contains(document.activeElement)).toBe(true);
  });

  it("focuses a remaining row when the focused version is removed", async () => {
    const { editor } = await setup();
    act(() => rows()[1]!.focus());
    await act(async () => {
      await editor.getExtension(VersioningExtension)!.remove!(NAMED.id);
    });
    expect(document.activeElement).toBe(rows()[1]);
  });

  it("does not steal focus after a removed version has been left", async () => {
    const { editor } = await setup({ onClose: () => {} });
    const control = screen.getByRole("button", { name: "Turn on comparison" });
    act(() => {
      rows()[1]!.focus();
      control.focus();
    });
    await act(async () => {
      await editor.getExtension(VersioningExtension)!.remove!(NAMED.id);
    });
    expect(document.activeElement).toBe(control);
  });

  it("gives every header control an accessible name", async () => {
    await setup({ onClose: () => {} });

    for (const name of [
      "Show named versions only",
      "Turn on comparison",
      "Close",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDefined();
    }
    expect(screen.getByRole("list", { name: "Versions" })).toBeDefined();
  });
});
