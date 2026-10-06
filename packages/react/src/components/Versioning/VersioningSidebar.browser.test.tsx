import { StrictMode, act, useEffect, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BlockNoteEditor } from "@blocknote/core";
import {
  createVersioningExtension,
  type createVersioning,
  type VersionStorage,
  type VersionSnapshot,
  type VersionResult,
} from "@blocknote/core/extensions";
import {
  DefaultVersionMenuItems,
  RestoreVersionItem,
  useRestoreVersionAction,
  usePreviewRow,
  useVersionSnapshot,
  VersioningSidebar,
  VersionMenu,
  VersionMenuItem,
} from "../../versioning.js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { VersioningTestView } from "./VersioningTestComponents.browser.js";
import {
  useVersioningSidebar,
  type VersioningSidebarContextValue,
} from "./VersioningSidebarContext.js";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; host: HTMLElement }[] = [];

function render(element: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  mounted.push({ root, host });
  return {
    rerender(next: ReactElement) {
      act(() => root.render(next));
    },
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NAMED: VersionSnapshot = { id: "b", createdAt: 2000, name: "Draft" };
const AUTOMATIC: VersionSnapshot = { id: "a", createdAt: 1000 };

function success<T>(value: T): VersionResult<T> {
  return { ok: true, value };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * Fake endpoints with spies on every verb, plus a gate that holds `list` and
 * `getContent` open so the loading states can be observed.
 */
function createFakeEndpoints(showCurrentVersion?: boolean) {
  let snapshots = [NAMED, AUTOMATIC];

  let gate: { promise: Promise<void>; release: () => void } | undefined;

  const endpoints = {
    showCurrentVersion,
    list: vi.fn(async () => {
      await gate?.promise;
      return success(snapshots);
    }),
    getContent: vi.fn(async (_id: string, _signal: AbortSignal) => {
      await gate?.promise;
      return success<unknown[]>([]);
    }),
    getAttributions: vi.fn(async (_target, _baselineId, _capturedAt, _signal) =>
      success(undefined),
    ),
    create: vi.fn(async (_doc: unknown[], name?: string) => {
      const version = { id: "created", createdAt: 3000, name };
      snapshots = [version, ...snapshots];
      return success(version);
    }),
    rename: vi.fn(async (id: string, name?: string) => {
      snapshots = snapshots.map((s) => (s.id === id ? { ...s, name } : s));
      return success(undefined);
    }),
    remove: vi.fn(async (id: string) => {
      snapshots = snapshots.filter((s) => s.id !== id);
      return success(undefined);
    }),
    restore: vi.fn(async (_id: string) => {
      await gate?.promise;
      return success(undefined);
    }),
  } satisfies VersionStorage<unknown[], unknown>;

  return {
    endpoints,
    /** Hold every async endpoint open until the returned callback is called. */
    block() {
      const { promise, resolve: release } = deferred<void>();
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

function createEditor(endpoints: VersionStorage<unknown[], unknown>) {
  const Versions = createVersioningExtension(() => ({
    storage: endpoints,
    adapter: {
      supportsComparison: true,
      open() {
        return {
          current: { content: [], capturedAt: 3000 },
          show() {},
          close() {},
        };
      },
    },
  }));
  return BlockNoteEditor.create({
    extensions: [Versions()],
  });
}

function mode(editor: BlockNoteEditor) {
  return editor.getExtension<
    ReturnType<typeof createVersioning<unknown[], unknown>> & { key: string }
  >("versioning")!;
}

// Assert only the displayed selection, separately from history and pending work.
function viewState(versioning: ReturnType<typeof mode>) {
  const state = versioning.store.state;
  if (state.mode === "live") {
    return { mode: "live" };
  }
  return state.displayed.type === "current"
    ? { mode: "current", compareToId: state.compareTo }
    : {
        mode: "snapshot",
        snapshotId: state.displayed.id,
        compareToId: state.compareTo,
      };
}

/** Render the sidebar inside a real editor and wait for its initial list. */
async function setup(
  props: Parameters<typeof VersioningSidebar>[0] = {},
  fake = createFakeEndpoints(),
) {
  const editor = createEditor(fake.endpoints);
  const view = render(
    <VersioningTestView editor={editor}>
      <VersioningSidebar {...props} />
    </VersioningTestView>,
  );
  // Let the mount effect's `list()` + initial preview settle.
  await act(async () => {});
  return { editor, fake, view };
}

function rows() {
  return page
    .getByRole("listitem")
    .elements()
    .map((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected version rows to be HTML elements");
      }
      return element;
    });
}

/** Capture the action runner so rejected promises can be asserted by the test. */
async function setupWithRun(fake = createFakeEndpoints()) {
  let run!: VersioningSidebarContextValue["run"];
  function CaptureRun() {
    const context = useVersioningSidebar();
    useEffect(() => {
      run = context.run;
    }, [context.run]);
    return null;
  }
  return { ...(await setup({ loadingIndicator: <CaptureRun /> }, fake)), run };
}

/**
 * A row's name field. The selected row and comparison baseline have one;
 * other rows show text (see {@link nameText}).
 */
function nameInput(row: HTMLElement) {
  const input = page
    .elementLocator(row)
    .getByRole("textbox", { name: "Version name", exact: true })
    .element();
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Expected the version name field to be an input");
  }
  return input;
}

/** What a row shows as its name: the field's value, or the text. */
function nameText(row: HTMLElement) {
  const input = page
    .elementLocator(row)
    .getByRole("textbox", { name: "Version name", exact: true })
    .query();
  if (input) {
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected the version name field to be an input");
    }
    return input.value;
  }
  return row.querySelector(".bn-snapshot-name")!.textContent;
}

async function click(element: Parameters<typeof userEvent.click>[0]) {
  await act(async () => {
    await userEvent.click(element);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

/** Open the row's "..." menu and wait for the matching item to render. */
async function openMenuItem(row: HTMLElement, label: RegExp) {
  const trigger = page
    .elementLocator(row)
    .getByRole("button", { name: "More actions", exact: true });
  if (trigger.element().getAttribute("aria-expanded") !== "true") {
    await click(trigger);
  }

  // The fixture portals the dropdown outside the row. Resolve the menu owned
  // by this trigger so another row's open menu cannot satisfy the lookup.
  return vi.waitFor(() => {
    const menuId = trigger.element().getAttribute("aria-controls");
    const menu = menuId ? document.getElementById(menuId) : null;
    if (!menu) {
      throw new Error("The row's actions menu did not open");
    }
    return page
      .elementLocator(menu)
      .getByRole("menuitem", { name: label })
      .element();
  });
}

/** Type `value` into a name field and end the edit with `key`. */
async function commit(input: HTMLInputElement, value: string, key: string) {
  await act(async () => {
    await userEvent.fill(input, value);
    // Both keys leave the field, and leaving it is what commits.
    await userEvent.keyboard(`{${key}}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VersioningSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const entry of mounted.splice(0)) {
      try {
        act(() => entry.root.unmount());
      } catch {
        // A test may already have unmounted this root explicitly.
      }
      entry.host.remove();
    }
  });

  it.each([undefined, "Published"])(
    "labels a latest-history Current checkpoint with name=%s and renames it in place",
    async (name) => {
      const fake = createFakeEndpoints(false);
      fake.setSnapshots([{ id: "latest", createdAt: 2000, name }, AUTOMATIC]);
      const { editor, view } = await setup({}, fake);
      const current = rows()[0]!;
      expect(current.getAttribute("aria-current")).toBe("true");
      expect(nameInput(current).placeholder).toBe("Current version");
      expect(nameInput(current).value).toBe(name ?? "");
      expect(viewState(mode(editor))).toMatchObject({
        mode: "snapshot",
        snapshotId: "latest",
      });
      view.unmount();
      // No edits between openings: the same checkpoint keeps its Current label.
      const unchanged = await setup({}, fake);
      expect(nameInput(rows()[0]!).placeholder).toBe("Current version");
      expect(nameInput(rows()[0]!).value).toBe(name ?? "");
      await commit(nameInput(rows()[0]!), "Renamed", "Enter");
      expect(fake.endpoints.rename).toHaveBeenCalledWith("latest", "Renamed");
      expect(fake.endpoints.create).not.toHaveBeenCalled();
      unchanged.view.unmount();
      const reopened = await setup({}, fake);
      expect(nameInput(rows()[0]!).value).toBe("Renamed");
      reopened.view.unmount();
    },
  );

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
        <VersioningTestView editor={editor}>
          <VersioningSidebar />
        </VersioningTestView>
      </StrictMode>,
    );
    await act(async () => {});
    expect(viewState(mode(editor)).mode).toBe("current");
    expect(editor.isEditable).toBe(false);
    view.unmount();
    expect(viewState(mode(editor)).mode).toBe("live");
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
      page
        .elementLocator(rows()[1]!)
        .getByRole("textbox", { name: "Version name", exact: true })
        .query(),
    ).toBeNull();
    expect(nameText(rows()[1]!)).toBe("Draft");

    // The first click selects; the name is text until then.
    await click(rows()[1]!);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(nameInput(rows()[1]!).value).toBe("Draft");
    expect(
      page
        .elementLocator(rows()[0]!)
        .getByRole("textbox", { name: "Version name", exact: true })
        .query(),
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
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );

    // The current row survives the filter; the unnamed one doesn't.
    expect(rows()).toHaveLength(2);
    expect(nameText(rows()[1]!)).toBe("Draft");

    await click(
      page.getByRole("button", { name: "Show all versions", exact: true }),
    );
    expect(rows()).toHaveLength(3);
  });

  it("excludes empty names but keeps whitespace names", async () => {
    const fake = createFakeEndpoints();
    fake.setSnapshots([
      { id: "empty", createdAt: 2500, name: "" },
      { id: "whitespace", createdAt: 2000, name: " " },
      AUTOMATIC,
    ]);
    await setup({}, fake);

    await click(
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );

    expect(rows()).toHaveLength(2);
    expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
    expect(nameText(rows()[1]!)).toBe(" ");
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
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );

    expect(
      page.getByText("No named versions", { exact: true }).element(),
    ).toBeDefined();
  });

  it("says no versions yet when nothing is stored", async () => {
    const fake = createFakeEndpoints();
    fake.setSnapshots([]);
    await setup({}, fake);

    expect(
      page.getByText("No versions yet", { exact: true }).element(),
    ).toBeDefined();
  });

  it("starts with comparison off and turns it on with a baseline", async () => {
    const { editor } = await setup();

    const versioning = mode(editor);
    expect(viewState(versioning)).toEqual({
      mode: "current",
      compareToId: undefined,
    });

    await click(
      page.getByRole("button", { name: "Turn on comparison", exact: true }),
    );
    await act(async () => {});

    // The current version is diffed against the newest stored version.
    expect(viewState(versioning)).toEqual({
      mode: "current",
      compareToId: NAMED.id,
    });
  });

  it("does not compare a hidden source against an unrelated visible version", async () => {
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
    expect(viewState(mode(editor))).toMatchObject({
      mode: "snapshot",
      snapshotId: AUTOMATIC.id,
      compareToId: undefined,
    });
  });

  it.each([false, true])(
    "compares the next named version in a named-only list (initial comparison: %s)",
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
          page.getByRole("button", {
            name: "Show named versions only",
            exact: true,
          }),
        );
        await click(
          page.getByRole("button", {
            name: "Turn on comparison",
            exact: true,
          }),
        );
      }
      const versioning = mode(editor);
      expect(viewState(versioning)).toEqual({
        mode: "current",
        compareToId: NAMED.id,
      });
      expect(rows()).toHaveLength(3);
      expect(rows()[1]!.classList.contains("comparing")).toBe(true);
      await click(rows()[1]!);
      expect(viewState(versioning)).toMatchObject({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: olderNamed.id,
      });
      expect(rows()[2]!.classList.contains("comparing")).toBe(true);
      await click(rows()[2]!);
      expect(viewState(versioning)).toMatchObject({
        mode: "snapshot",
        snapshotId: olderNamed.id,
        compareToId: undefined,
      });
      expect(document.querySelector(".bn-snapshot.comparing")).toBeNull();
    },
  );

  it.each([0, 1])(
    "preserves comparison when showing all versions and keeps selection %s",
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
      await click(
        page.getByRole("button", { name: "Show all versions", exact: true }),
      );

      expect(viewState(mode(editor))).toEqual(
        selectedIndex === 0
          ? { mode: "current", compareToId: "recent-auto" }
          : {
              mode: "snapshot",
              snapshotId: NAMED.id,
              compareToId: AUTOMATIC.id,
            },
      );
      expect(rows()).toHaveLength(5);
      expect(
        page.getByText("Comparing to", { exact: true }).element(),
      ).toBeDefined();
      expect(
        page
          .getByRole("button", { name: "Turn off comparison", exact: true })
          .element(),
      ).toBeDefined();
      expect(editor.isEditable).toBe(false);
    },
  );

  it("replaces the loader with a history error when the initial fetch fails", async () => {
    const fake = createFakeEndpoints();
    const onError = vi.fn();
    fake.endpoints.list.mockResolvedValueOnce({
      ok: false,
      error: { type: "network" },
    });
    const { editor } = await setup({ onError }, fake);

    expect(page.getByRole("alert").element().textContent).toBe(
      "Failed to load version history",
    );
    expect(page.getByRole("status").query()).toBeNull();
    expect(rows()).toHaveLength(0);
    expect(mode(editor).store.state).toMatchObject({
      mode: "versions",
      history: { status: "error" },
    });
    expect(editor.isEditable).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps loaded history visible on fetch failure and clears the error on success", async () => {
    const { editor, fake } = await setup();
    const versioning = mode(editor);
    await click(rows()[1]!);
    fake.endpoints.list.mockResolvedValueOnce({
      ok: false,
      error: { type: "network" },
    });
    await act(async () => {
      expect(await versioning.list()).toEqual({
        status: "error",
        error: { type: "network" },
      });
    });

    expect(page.getByRole("alert").element().textContent).toBe(
      "Failed to load version history",
    );
    expect(rows()).toHaveLength(3);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(page.getByRole("status").query()).toBeNull();
    await act(async () => {
      await versioning.list();
    });
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it("propagates an action failure without showing a fetch error", async () => {
    const { run } = await setupWithRun();
    const cause = new Error("code bug");
    const onSuccess = vi.fn();
    await expect(
      run(async () => {
        throw cause;
      }, onSuccess),
    ).rejects.toBe(cause);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it("shows a safe action error and skips success callbacks until retry succeeds", async () => {
    const { run } = await setupWithRun();
    const onSuccess = vi.fn();
    await act(async () => {
      await run(
        async () => ({
          status: "error" as const,
          error: { type: "forbidden" as const },
        }),
        onSuccess,
      );
    });
    expect(page.getByRole("alert").element().textContent).toBe(
      "Something went wrong. Please try again.",
    );
    expect(onSuccess).not.toHaveBeenCalled();
    await act(async () => {
      await run(async () => ({ status: "done" }), onSuccess);
    });
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it.each(["create", "rename"] as const)(
    "preserves the naming draft after a failed %s and retries on Enter",
    async (operation) => {
      const { fake } = await setup();
      if (operation === "rename") {
        await click(rows()[1]!);
      }
      const rowIndex = operation === "create" ? 0 : 1;
      const input = nameInput(rows()[rowIndex]!);
      fake.endpoints[operation].mockResolvedValueOnce({
        ok: false,
        error: { type: "conflict" },
      });
      await commit(input, "Unsaved milestone", "Enter");
      expect(nameInput(rows()[rowIndex]!).value).toBe("Unsaved milestone");
      expect(page.getByRole("alert").element().textContent).toBe(
        "Something went wrong. Please try again.",
      );
      expect(fake.endpoints.list).toHaveBeenCalledTimes(1);
      await commit(nameInput(rows()[rowIndex]!), "Unsaved milestone", "Enter");
      expect(fake.endpoints[operation]).toHaveBeenCalledTimes(2);
      expect(fake.endpoints.list).toHaveBeenCalledTimes(2);
      expect(page.getByRole("alert").query()).toBeNull();
      expect(
        operation === "create"
          ? nameText(rows()[1]!)
          : nameInput(rows()[1]!).value,
      ).toBe("Unsaved milestone");
    },
  );

  it("keeps the panel and selected preview after an expected restore failure", async () => {
    const { editor, fake } = await setup();
    await click(rows()[1]!);
    fake.endpoints.restore.mockResolvedValueOnce({
      ok: false,
      error: { type: "timeout", outcome: "unknown" },
    });
    await click(await openMenuItem(rows()[1]!, /^Restore$/));
    expect(page.getByRole("alert").element().textContent).toBe(
      "Something went wrong. Please try again.",
    );
    expect(mode(editor).store.state).toMatchObject({
      mode: "versions",
      displayed: { type: "snapshot", id: NAMED.id },
      restoring: false,
    });
    expect(editor.isEditable).toBe(false);
  });

  it("keeps comparison enabled and chooses the next visible named baseline", async () => {
    const fake = createFakeEndpoints();
    const olderNamed = { id: "older", createdAt: 500, name: "First draft" };
    fake.setSnapshots([NAMED, AUTOMATIC, olderNamed]);
    const { editor } = await setup({ defaultComparisonMode: true }, fake);
    await click(rows()[1]!);
    const versioning = mode(editor);
    expect(viewState(versioning)).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: AUTOMATIC.id,
    });
    expect(rows()[1]!.classList.contains("bn-snapshot-comparison-source")).toBe(
      true,
    );
    expect(rows()[2]!.classList.contains("comparing")).toBe(true);

    await click(
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );

    expect(viewState(versioning)).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: olderNamed.id,
    });
    expect(rows()).toHaveLength(3);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(rows()[1]!.classList.contains("bn-snapshot-comparison-source")).toBe(
      true,
    );
    expect(
      page.getByText("Comparing to", { exact: true }).element(),
    ).toBeDefined();
    expect(
      page
        .getByRole("button", { name: "Turn off comparison", exact: true })
        .element(),
    ).toBeDefined();

    await click(
      page.getByRole("button", { name: "Show all versions", exact: true }),
    );
    expect(viewState(versioning)).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: AUTOMATIC.id,
    });
  });

  it("resets comparison to the next named version when entering named-only history", async () => {
    const { editor } = await setup();
    await click(await openMenuItem(rows()[1]!, /^Compare with this version$/));
    await click(
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );
    expect(viewState(mode(editor))).toEqual({
      mode: "current",
      compareToId: NAMED.id,
    });
    expect(
      page.getByText("Comparing to", { exact: true }).element(),
    ).toBeDefined();
  });

  it("resets an explicit baseline when showing all versions", async () => {
    const fake = createFakeEndpoints();
    const olderNamed = { id: "older", createdAt: 500, name: "First draft" };
    fake.setSnapshots([NAMED, AUTOMATIC, olderNamed]);
    const { editor } = await setup({ defaultComparisonMode: true }, fake);
    await click(rows()[1]!);
    await click(
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );
    await click(await openMenuItem(rows()[2]!, /^Compare with this version$/));
    fake.endpoints.getContent.mockClear();
    await click(
      page.getByRole("button", { name: "Show all versions", exact: true }),
    );
    expect(viewState(mode(editor))).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: AUTOMATIC.id,
    });
    expect(fake.endpoints.getContent).toHaveBeenCalled();
    expect(
      page
        .getByRole("button", { name: "Turn off comparison", exact: true })
        .element(),
    ).toBeDefined();

    // Selecting the source again keeps the chronological comparison.
    await click(rows()[1]!);
    expect(viewState(mode(editor))).toEqual({
      mode: "snapshot",
      snapshotId: NAMED.id,
      compareToId: AUTOMATIC.id,
    });
  });

  it("keeps the displayed version when named-only history hides its row", async () => {
    const { editor } = await setup({ defaultComparisonMode: true });
    await click(rows()[2]!);
    await click(
      page.getByRole("button", {
        name: "Show named versions only",
        exact: true,
      }),
    );
    expect(viewState(mode(editor))).toEqual({
      mode: "snapshot",
      snapshotId: AUTOMATIC.id,
      compareToId: undefined,
    });
    expect(
      rows().some((row) => row.getAttribute("aria-current") === "true"),
    ).toBe(false);
    expect(editor.isEditable).toBe(false);
  });

  it.each([false, true])(
    "offers Current naming and preserves custom actions: %s",
    async (custom) => {
      const fake = createFakeEndpoints();
      const editor = createEditor(fake.endpoints);
      render(
        <VersioningTestView editor={editor}>
          <VersioningSidebar
            snapshotMenu={
              custom ? (
                <VersionMenu>
                  <VersionMenuItem onClick={() => {}}>Download</VersionMenuItem>
                </VersionMenu>
              ) : undefined
            }
          />
        </VersioningTestView>,
      );
      await act(async () => {});
      if (custom) {
        expect(await openMenuItem(rows()[0]!, /^Download$/)).toBeDefined();
      } else {
        expect(
          await openMenuItem(rows()[0]!, /^Name this version$/),
        ).toBeDefined();
      }
    },
  );

  it.each(["none", "previous"])(
    "compares against a snapshot whose id is %s",
    async (id) => {
      const fake = createFakeEndpoints();
      fake.setSnapshots([NAMED, { ...AUTOMATIC, id }]);
      const { editor } = await setup({}, fake);

      await click(
        await openMenuItem(rows()[2]!, /^Compare with this version$/),
      );

      expect(viewState(mode(editor))).toEqual({
        mode: "current",
        compareToId: id,
      });
      expect(fake.endpoints.getContent).toHaveBeenCalledWith(
        id,
        expect.any(AbortSignal),
      );
    },
  );

  it.each([
    { shownIndex: 1, selectedIndex: 2 },
    { shownIndex: 2, selectedIndex: 1 },
  ])(
    "compares versions in chronological order with row $shownIndex shown and row $selectedIndex selected",
    async ({ shownIndex, selectedIndex }) => {
      const { editor, fake } = await setup();
      await click(rows()[shownIndex]!);
      await click(
        await openMenuItem(
          rows()[selectedIndex]!,
          /^Compare with this version$/,
        ),
      );

      expect(viewState(mode(editor))).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: AUTOMATIC.id,
      });
      expect(fake.endpoints.getAttributions).toHaveBeenLastCalledWith(
        { type: "snapshot", id: NAMED.id },
        AUTOMATIC.id,
        3000,
        expect.any(AbortSignal),
      );
    },
  );

  it("propagates a follow-up failure without showing a fetch error", async () => {
    const { run } = await setupWithRun();
    const cause = new Error("follow-up bug");
    await expect(
      run(
        async () => ({ status: "done" }),
        async () => {
          throw cause;
        },
      ),
    ).rejects.toBe(cause);
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it.each(["cancelled", "unavailable"] as const)(
    "does not run success callbacks for a %s action",
    async (status) => {
      const { run } = await setupWithRun();
      const onSuccess = vi.fn();
      await act(async () => {
        expect(await run(async () => ({ status }), onSuccess)).toEqual({
          status,
        });
      });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(page.getByRole("alert").query()).toBeNull();
    },
  );

  it("starts comparing when asked to", async () => {
    const { editor } = await setup({ defaultComparisonMode: true });

    expect(viewState(mode(editor))).toEqual({
      mode: "current",
      compareToId: NAMED.id,
    });
  });

  it("selects a version when its row is clicked", async () => {
    const { editor } = await setup();

    await click(rows()[2]!);
    await act(async () => {});

    expect(viewState(mode(editor))).toEqual({
      mode: "snapshot",
      snapshotId: AUTOMATIC.id,
      compareToId: undefined,
    });
  });

  it("hides self-comparison only on the version currently being previewed", async () => {
    await setup();
    await click(rows()[1]!);

    const selectedRow = rows()[1]!;
    const restoreItem = await openMenuItem(selectedRow, /^Restore$/);
    const menu = restoreItem?.closest('[role="menu"]');
    if (!(menu instanceof HTMLElement)) {
      throw new Error("Expected the snapshot menu to be open");
    }
    expect(
      page
        .elementLocator(menu)
        .getByText("Compare with this version", { exact: true })
        .query(),
    ).toBeNull();

    expect(
      await openMenuItem(rows()[2]!, /^Compare with this version$/),
    ).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Renaming
  // -------------------------------------------------------------------------

  describe("naming and renaming", () => {
    const openRenameItem = (row: HTMLElement) =>
      openMenuItem(row, /^(Name this version|Rename)$/);

    it.each([undefined, "Existing name"])(
      "names the comparison baseline without switching versions (name: %s)",
      async (name) => {
        const fake = createFakeEndpoints();
        fake.setSnapshots([NAMED, { ...AUTOMATIC, name }]);
        const { editor } = await setup({ defaultComparisonMode: true }, fake);
        await click(rows()[1]!);
        const comparison = {
          mode: "snapshot",
          snapshotId: NAMED.id,
          compareToId: AUTOMATIC.id,
        };
        expect(viewState(mode(editor))).toEqual(comparison);

        await click(await openRenameItem(rows()[2]!));

        expect(viewState(mode(editor))).toEqual(comparison);
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(nameInput(rows()[2]!)),
        );
        await commit(nameInput(rows()[2]!), "Final", "Enter");
        expect(fake.endpoints.rename).toHaveBeenCalledExactlyOnceWith(
          AUTOMATIC.id,
          "Final",
        );
        expect(nameInput(rows()[2]!).value).toBe("Final");
        expect(viewState(mode(editor))).toEqual(comparison);
      },
    );

    it("focuses the name field when started from the menu", async () => {
      await setup();
      // Selected already, so the field is there to focus.
      await click(rows()[1]!);
      const row = rows()[1]!;

      await click(await openRenameItem(row));
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(nameInput(row)),
      );
    });

    it("selects the row first when started from an unselected row's menu", async () => {
      await setup();
      const row = rows()[2]!;
      expect(row.getAttribute("aria-current")).toBeNull();

      await click(await openRenameItem(row));
      await vi.waitFor(() => {
        expect(rows()[2]!.getAttribute("aria-current")).toBe("true");
        expect(document.activeElement).toBe(nameInput(rows()[2]!));
      });
    });

    it("keeps frozen Current separate from a newly named checkpoint", async () => {
      const { fake } = await setup();

      await commit(nameInput(rows()[0]!), "Milestone", "Enter");

      expect(fake.endpoints.create).toHaveBeenCalledWith([], "Milestone", 3000);
      expect(fake.endpoints.rename).not.toHaveBeenCalled();
      const row = rows()[0]!;
      expect(nameInput(row).value).toBe("");
      expect(nameText(rows()[1]!)).toBe("Milestone");
      expect(nameInput(row).placeholder).toBe("Current version");
      expect(rows()).toHaveLength(4);
    });

    it("refreshes history after creating a checkpoint", async () => {
      const fake = createFakeEndpoints();
      fake.endpoints.create.mockImplementation(async (_doc, name) => {
        return success({ id: "new", createdAt: 2500, name });
      });

      await setup({}, fake);
      await commit(nameInput(rows()[0]!), "Milestone", "Enter");

      expect(nameInput(rows()[0]!).value).toBe("");
      expect(rows()).toHaveLength(3);
      expect(fake.endpoints.list).toHaveBeenCalledTimes(2);
    });

    it("renames a stored version through `rename`", async () => {
      const { fake } = await setup();

      await click(rows()[1]!);
      await commit(nameInput(rows()[1]!), "Final", "Enter");

      expect(fake.endpoints.rename).toHaveBeenCalledWith(NAMED.id, "Final");
      expect(fake.endpoints.create).not.toHaveBeenCalled();
      // Enter commits by moving focus to the row, keeping keyboard
      // navigation in the list rather than dropping focus to the body.
      expect(document.activeElement).toBe(rows()[1]);
    });

    it.each([
      { value: "  Final  ", expected: "Final" },
      { value: "  ", expected: "" },
    ])(
      "keeps '$expected' visible while a rename saves",
      async ({ value, expected }) => {
        const { fake } = await setup();
        await click(rows()[1]!);
        const { promise: pendingRename, resolve: finishRename } =
          deferred<void>();
        const rename = fake.endpoints.rename.getMockImplementation()!;
        fake.endpoints.rename.mockImplementationOnce(async (id, name) => {
          await pendingRename;
          return rename(id, name);
        });
        const releaseHistory = fake.block();

        await commit(nameInput(rows()[1]!), value, "Enter");

        expect(nameInput(rows()[1]!).value).toBe(expected);
        expect(fake.endpoints.rename).toHaveBeenCalledWith(
          NAMED.id,
          expected || undefined,
        );

        // Escape restores the locally committed name, not the stale backend name.
        await commit(nameInput(rows()[1]!), "Discarded", "Escape");
        expect(nameInput(rows()[1]!).value).toBe(expected);
        expect(fake.endpoints.rename).toHaveBeenCalledTimes(1);

        await act(async () => finishRename());
        expect(nameInput(rows()[1]!).value).toBe(expected);
        await act(async () => releaseHistory());
        expect(nameInput(rows()[1]!).value).toBe(expected);
      },
    );

    it("preserves a newer naming draft when a pending rename succeeds and refreshes", async () => {
      const { fake } = await setup();
      await click(rows()[1]!);
      const { promise: pendingRename, resolve: finishRename } =
        deferred<void>();
      const rename = fake.endpoints.rename.getMockImplementation()!;
      fake.endpoints.rename.mockImplementationOnce(async (id, name) => {
        await pendingRename;
        return rename(id, name);
      });
      const releaseHistory = fake.block();

      await commit(nameInput(rows()[1]!), "Submitted A", "Enter");
      expect(fake.endpoints.rename).toHaveBeenCalledExactlyOnceWith(
        NAMED.id,
        "Submitted A",
      );
      const input = nameInput(rows()[1]!);
      await act(async () => userEvent.fill(input, "Draft B"));
      expect(document.activeElement).toBe(input);

      await act(async () => finishRename());
      expect(fake.endpoints.list).toHaveBeenCalledTimes(2);
      expect(nameInput(rows()[1]!)).toBe(input);
      expect(input.value).toBe("Draft B");
      expect(document.activeElement).toBe(input);

      await act(async () => releaseHistory());
      expect(nameInput(rows()[1]!)).toBe(input);
      expect(input.value).toBe("Draft B");
      expect(document.activeElement).toBe(input);
      expect(fake.endpoints.rename).toHaveBeenCalledTimes(1);
      expect(page.getByRole("alert").query()).toBeNull();

      await commit(input, "Draft B", "Enter");
      expect(fake.endpoints.rename).toHaveBeenLastCalledWith(
        NAMED.id,
        "Draft B",
      );
      expect(fake.endpoints.rename).toHaveBeenCalledTimes(2);
      expect(nameInput(rows()[1]!).value).toBe("Draft B");
    });

    it("cancels on Escape without renaming", async () => {
      const { fake } = await setup();

      await click(rows()[1]!);
      await commit(nameInput(rows()[1]!), "Discarded", "Escape");

      expect(fake.endpoints.rename).not.toHaveBeenCalled();
      expect(nameInput(rows()[1]!).value).toBe("Draft");
    });

    it("re-renders when a version is renamed from outside the row", async () => {
      const { editor } = await setup();
      const versioning = mode(editor);

      await act(async () => {
        await versioning.rename(NAMED.id, "Renamed elsewhere");
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
      expect(
        page.getByRole("button", { name: "More actions", exact: true }).query(),
      ).toBeNull();
      await click(rows()[1]!);
      expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    },
  );

  it("prevents disabled custom actions", async () => {
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
    );
    await click(
      page
        .elementLocator(rows()[1]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    for (const label of ["Disabled action", "Disabled checked action"]) {
      const item = await vi.waitFor(() => {
        const labelElement = page.getByText(label, { exact: true }).element();
        const menuItem = labelElement.closest('[role^="menuitem"]');
        if (!(menuItem instanceof HTMLElement)) {
          throw new Error("Missing menu item");
        }
        return menuItem;
      });
      expect(
        item.hasAttribute("disabled") ||
          item.getAttribute("aria-disabled") === "true",
      ).toBe(true);
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
      page
        .elementLocator(rows()[1]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    const download = await openMenuItem(rows()[1]!, /^Download$/);
    expect(page.getByText("Restore", { exact: true }).element()).toBeDefined();
    expect(page.getByText("Delete", { exact: true }).element()).toBeDefined();
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
      page
        .elementLocator(rows()[0]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    const unavailable = await openMenuItem(rows()[0]!, /^Cannot restore$/);
    expect(
      unavailable.hasAttribute("disabled") ||
        unavailable.getAttribute("aria-disabled") === "true",
    ).toBe(true);
    expect(fake.endpoints.restore).not.toHaveBeenCalled();
    // Close the current menu before opening the stored version's menu.
    await click(
      page
        .elementLocator(rows()[0]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    await click(rows()[1]!);
    await click(
      page
        .elementLocator(rows()[1]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    await click(await openMenuItem(rows()[1]!, /^Roll back$/));
    expect(fake.endpoints.restore).toHaveBeenCalledWith(NAMED.id);
    expect(viewState(mode(editor)).mode).toBe("current");
    expect(editor.isEditable).toBe(false);
  });

  it("customizes a default item's presentation and disables its action", async () => {
    const { fake } = await setup({
      snapshotMenu: (
        <VersionMenu>
          <RestoreVersionItem
            disabled
            className="custom-restore"
            icon={<span aria-hidden="true">Custom icon</span>}
          >
            Roll back
          </RestoreVersionItem>
        </VersionMenu>
      ),
    });
    await click(
      page
        .elementLocator(rows()[1]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );
    const label = await openMenuItem(rows()[1]!, /^Roll back$/);
    const item = label.closest<HTMLElement>('[role="menuitem"]');
    if (!item) {
      throw new Error("Missing restore item");
    }
    expect(
      page
        .elementLocator(item)
        .getByText("Custom icon", { exact: true })
        .element(),
    ).toBeDefined();
    expect(item.classList.contains("bn-menu-item")).toBe(true);
    expect(item.classList.contains("custom-restore")).toBe(true);
    expect(
      item.hasAttribute("disabled") ||
        item.getAttribute("aria-disabled") === "true",
    ).toBe(true);
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
      page
        .elementLocator(rows()[1]!)
        .getByRole("button", { name: "More actions", exact: true }),
    );

    await vi.waitFor(() =>
      expect(
        page.getByText("Copy Draft", { exact: true }).element(),
      ).toBeDefined(),
    );
    expect(page.getByText("Restore", { exact: true }).query()).toBeNull();
    expect(page.getByText("Delete", { exact: true }).query()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  it("moves through the list with the arrow keys and selects with Enter", async () => {
    const { editor } = await setup();

    rows()[0]!.focus();
    await act(async () => userEvent.keyboard("{ArrowDown}"));
    expect(document.activeElement).toBe(rows()[1]);

    await act(async () => userEvent.keyboard("{End}"));
    expect(document.activeElement).toBe(rows()[2]);

    await act(async () => userEvent.keyboard("{Home}"));
    expect(document.activeElement).toBe(rows()[0]);

    await act(async () => userEvent.keyboard("{ArrowDown}"));
    await act(async () => userEvent.keyboard("{Enter}"));
    await act(async () => {});

    expect(viewState(mode(editor))).toEqual({
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
      <VersioningTestView editor={editor}>
        <VersioningSidebar />
      </VersioningTestView>,
    );

    expect(page.getByRole("status").element()).toBeDefined();
    expect(
      page.getByText("Loading versions", { exact: true }).element(),
    ).toBeDefined();
    expect(page.getByRole("listitem").elements()).toHaveLength(0);

    await act(async () => {
      release();
    });

    expect(page.getByRole("status").query()).toBeNull();
    expect(rows()).toHaveLength(3);
  });

  it("keeps the existing rows and selection visible during a refresh", async () => {
    const { editor, fake } = await setup();
    await click(rows()[1]!);
    const selectedRow = rows()[1]!;
    const release = fake.block();
    const versioning = mode(editor);
    let refresh!: ReturnType<typeof versioning.list>;
    act(() => {
      refresh = versioning.list();
    });

    expect(page.getByRole("list").element().getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(page.getByRole("status").query()).toBeNull();
    expect(rows()).toHaveLength(3);
    expect(rows()[1]).toBe(selectedRow);
    expect(selectedRow.getAttribute("aria-current")).toBe("true");
    expect(editor.isEditable).toBe(false);

    fake.setSnapshots([NAMED]);
    await act(async () => {
      release();
      await refresh;
    });
    expect(
      page.getByRole("list").element().getAttribute("aria-busy"),
    ).toBeNull();
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
      expect(page.getByRole("status").element()).toBeDefined();

      if (exit === "close") {
        await click(page.getByRole("button", { name: "Close", exact: true }));
        expect(onClose).toHaveBeenCalledOnce();
      } else {
        view.rerender(<VersioningTestView editor={editor} />);
      }
      await act(async () => release());
      expect(viewState(mode(editor))).toEqual({ mode: "live" });
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
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it("clears a failed row's busy marker, restores selection, and allows retry", async () => {
    const { editor, fake, run } = await setupWithRun();
    let rejectContent!: (error: Error) => void;
    fake.endpoints.getContent.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectContent = reject;
        }),
    );
    const cause = new Error("private backend detail");
    const ext = mode(editor);
    let pending!: Promise<unknown>;
    await act(async () => {
      pending = run(() => ext.select({ type: "snapshot", id: NAMED.id }));
    });
    expect(rows()[1]!.getAttribute("aria-busy")).toBe("true");
    await act(async () => {
      const rejected = expect(pending).rejects.toBe(cause);
      rejectContent(cause);
      await rejected;
    });
    expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();
    expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
    expect(page.getByRole("alert").query()).toBeNull();

    await click(rows()[1]!);
    expect(rows()[1]!.getAttribute("aria-current")).toBe("true");
    expect(rows()[1]!.getAttribute("aria-busy")).toBeNull();
    expect(page.getByRole("alert").query()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Row actions
  // -------------------------------------------------------------------------

  describe("row actions", () => {
    it.each([
      { namedOnly: true, selection: "deleted" },
      { namedOnly: true, selection: "baseline" },
      { namedOnly: true, selection: "unrelated" },
      { namedOnly: false, selection: "deleted" },
    ] as const)(
      "keeps selection and comparison when deletion only clears a name ($namedOnly, $selection)",
      async ({ namedOnly, selection }) => {
        const fake = createFakeEndpoints();
        const older = { id: "older", createdAt: 500, name: "First draft" };
        fake.setSnapshots([NAMED, older]);
        fake.endpoints.remove.mockImplementation(async (snapshot) => {
          return fake.endpoints.rename(snapshot, undefined);
        });
        const { editor } = await setup(
          {
            defaultNamedOnly: namedOnly,
            defaultComparisonMode: selection === "baseline",
          },
          fake,
        );
        const ext = mode(editor);
        if (selection === "deleted") {
          await click(rows()[1]!);
        }
        fake.endpoints.getContent.mockClear();

        await click(await openMenuItem(rows()[1]!, /^Delete$/));

        expect(
          ext.store.state.mode === "versions"
            ? ext.store.state.history.data?.find(
                (version) => version.id === NAMED.id,
              )?.name
            : undefined,
        ).toBeUndefined();
        expect(rows()).toHaveLength(namedOnly ? 2 : 3);
        expect(viewState(ext)).toEqual(
          selection === "deleted"
            ? { mode: "snapshot", snapshotId: NAMED.id, compareToId: undefined }
            : {
                mode: "current",
                compareToId: selection === "baseline" ? older.id : undefined,
              },
        );
        expect(
          rows().filter((row) => row.hasAttribute("aria-current")),
        ).toHaveLength(namedOnly && selection === "deleted" ? 0 : 1);
        expect(editor.isEditable).toBe(false);
        if (selection !== "baseline") {
          expect(fake.endpoints.getContent).not.toHaveBeenCalled();
        }
      },
    );

    it("re-selects the current version after deleting the one on screen", async () => {
      const { editor } = await setup();
      const ext = mode(editor);

      await click(rows()[1]!);
      expect(viewState(ext)).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: undefined,
      });

      await click(await openMenuItem(rows()[1]!, /^Delete$/));
      await act(async () => {});

      // The panel always has a selection, and the editor stays read-only for
      // as long as it is open.
      expect(viewState(ext)).toEqual({
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
          await click(page.getByRole("button", { name: "Close", exact: true }));
        } else {
          view.rerender(<VersioningTestView editor={editor} />);
        }
        await act(async () => release());

        expect(viewState(mode(editor))).toEqual({
          mode: "live",
        });
        expect(editor.isEditable).toBe(true);
      },
    );

    it.each([
      { interaction: "another row", comparison: false },
      { interaction: "turn on comparison", comparison: false },
      { interaction: "turn off comparison", comparison: true },
    ] as const)(
      "finishes a delayed restore after clicking $interaction without a stuck loader",
      async ({ interaction, comparison }) => {
        const { editor, fake } = await setup({
          defaultComparisonMode: comparison,
        });
        await click(rows()[1]!);
        const { promise: pendingRestore, resolve: finishRestore } =
          deferred<void>();
        fake.endpoints.restore.mockImplementationOnce(async () => {
          await pendingRestore;
          return success(undefined);
        });
        await click(await openMenuItem(rows()[1]!, /^Restore$/));
        expect(mode(editor).store.state).toMatchObject({ restoring: true });
        fake.endpoints.getContent.mockClear();

        if (interaction === "another row") {
          await click(rows()[2]!);
        } else {
          await click(
            page.getByRole("button", {
              name: comparison ? "Turn off comparison" : "Turn on comparison",
              exact: true,
            }),
          );
        }
        expect(fake.endpoints.getContent).not.toHaveBeenCalled();
        expect(mode(editor).store.state).toMatchObject({
          restoring: true,
          displayed: { type: "snapshot", id: NAMED.id },
        });

        await act(async () => finishRestore());
        await vi.waitFor(() => {
          expect(viewState(mode(editor)).mode).toBe("current");
          expect(page.getByRole("status").query()).toBeNull();
          expect(rows()).toHaveLength(3);
          expect(rows().every((row) => !row.hasAttribute("aria-busy"))).toBe(
            true,
          );
          expect(
            page.getByRole("list").element().getAttribute("aria-busy"),
          ).toBeNull();
        });
        expect(fake.endpoints.restore).toHaveBeenCalledExactlyOnceWith(
          NAMED.id,
        );
        expect(page.getByRole("alert").query()).toBeNull();
        expect(editor.isEditable).toBe(false);
      },
    );

    it.each([
      { exit: "close", outcome: "network error" },
      { exit: "close", outcome: "success" },
      { exit: "unmount", outcome: "network error" },
      { exit: "unmount", outcome: "success" },
    ] as const)(
      "loads reopened history after $exit during a delayed restore ending in $outcome",
      async ({ exit, outcome }) => {
        const onClose = vi.fn();
        const { editor, fake, view } = await setup({ onClose });
        await click(rows()[1]!);
        const { promise: pendingRestore, resolve: finishRestore } =
          deferred<void>();
        fake.endpoints.restore.mockImplementationOnce(async () => {
          await pendingRestore;
          return outcome === "success"
            ? success(undefined)
            : { ok: false, error: { type: "network" } };
        });
        await click(await openMenuItem(rows()[1]!, /^Restore$/));
        expect(mode(editor).store.state).toMatchObject({ restoring: true });

        if (exit === "close") {
          await click(page.getByRole("button", { name: "Close", exact: true }));
          expect(onClose).toHaveBeenCalledOnce();
        }
        view.rerender(<VersioningTestView editor={editor} />);
        expect(viewState(mode(editor))).toEqual({ mode: "live" });
        const listCallsBeforeReopen = fake.endpoints.list.mock.calls.length;
        const reopenedOnClose = vi.fn();
        view.rerender(
          <VersioningTestView editor={editor}>
            <VersioningSidebar onClose={reopenedOnClose} />
          </VersioningTestView>,
        );
        await act(async () => {});

        // Loading history is allowed even while the older restore is pending.
        // Keep checking its completion too if the initial load is broken.
        expect
          .soft(fake.endpoints.list)
          .toHaveBeenCalledTimes(listCallsBeforeReopen + 1);
        expect.soft(rows()).toHaveLength(3);
        expect.soft(page.getByRole("status").query()).toBeNull();
        expect.soft(mode(editor).store.state).toMatchObject({
          mode: "versions",
          restoring: true,
          displayed: { type: "current" },
          history: { status: "success" },
        });

        await act(async () => finishRestore());
        await vi.waitFor(() => {
          expect(mode(editor).store.state).toMatchObject({
            mode: "versions",
            restoring: false,
            displayed: { type: "current" },
            history: { status: "success" },
          });
          expect(rows()).toHaveLength(3);
          expect(page.getByRole("status").query()).toBeNull();
          expect(
            page.getByRole("list").element().getAttribute("aria-busy"),
          ).toBeNull();
          expect(rows().every((row) => !row.hasAttribute("aria-busy"))).toBe(
            true,
          );
        });
        expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
        expect(reopenedOnClose).not.toHaveBeenCalled();
        expect(page.getByRole("alert").query()).toBeNull();
        expect(editor.isEditable).toBe(false);
      },
    );

    it("keeps comparison off when a compare-with menu action is refused during a failed restore", async () => {
      const { editor, fake } = await setup();
      await click(rows()[1]!);
      const { promise: pendingRestore, resolve: finishRestore } =
        deferred<void>();
      fake.endpoints.restore.mockImplementationOnce(async () => {
        await pendingRestore;
        return { ok: false, error: { type: "network" } };
      });
      await click(await openMenuItem(rows()[1]!, /^Restore$/));
      fake.endpoints.getContent.mockClear();

      await click(
        await openMenuItem(rows()[2]!, /^Compare with this version$/),
      );
      expect(fake.endpoints.getContent).not.toHaveBeenCalled();
      expect(mode(editor).store.state).toMatchObject({ restoring: true });
      await act(async () => finishRestore());

      expect(mode(editor).store.state).toMatchObject({ restoring: false });
      expect(viewState(mode(editor))).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: undefined,
      });
      expect(
        page
          .getByRole("button", { name: "Turn on comparison", exact: true })
          .query(),
      ).not.toBeNull();
      expect(
        page
          .getByRole("button", { name: "Turn off comparison", exact: true })
          .query(),
      ).toBeNull();
      expect(rows()).toHaveLength(3);
      expect(page.getByRole("status").query()).toBeNull();
      expect(page.getByRole("alert").element().textContent).toBe(
        "Something went wrong. Please try again.",
      );
      expect(editor.isEditable).toBe(false);
    });

    it("keeps the selection when a restore failure propagates", async () => {
      const fake = createFakeEndpoints();
      const cause = new Error("network");
      fake.endpoints.restore.mockRejectedValueOnce(cause);
      const { editor, run } = await setupWithRun(fake);
      const ext = mode(editor);

      await click(rows()[1]!);
      await act(async () => {
        await expect(run(() => ext.restore!(NAMED.id))).rejects.toBe(cause);
      });
      expect(page.getByRole("alert").query()).toBeNull();
      expect(viewState(ext)).toEqual({
        mode: "snapshot",
        snapshotId: NAMED.id,
        compareToId: undefined,
      });
      expect(editor.isEditable).toBe(false);

      // Another version can still be selected after the failure.
      await click(rows()[2]!);
      await act(async () => {});
      expect(page.getByRole("alert").query()).toBeNull();
    });

    it("propagates a name that the backend rejects", async () => {
      const fake = createFakeEndpoints();
      const cause = new Error("no activity");
      fake.endpoints.create.mockRejectedValueOnce(cause);
      const { editor, run } = await setupWithRun(fake);
      const ext = mode(editor);
      await act(async () => {
        await expect(run(() => ext.create("First draft"))).rejects.toBe(cause);
      });
      expect(page.getByRole("alert").query()).toBeNull();
      expect(nameInput(rows()[0]!).value).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility baseline
  // -------------------------------------------------------------------------

  it("propagates a superseded naming action's failure", async () => {
    const { editor, fake, run } = await setupWithRun();
    let rejectName!: (error: Error) => void;
    fake.endpoints.create.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectName = reject;
        }),
    );
    const ext = mode(editor);
    const cause = new Error("old naming failed");
    const rejected = expect(run(() => ext.create("Draft"))).rejects.toBe(cause);
    await click(rows()[1]!);
    await act(async () => {
      rejectName(cause);
      await rejected;
    });
    expect(page.getByRole("alert").query()).toBeNull();
  });

  it("names the panel, toolbar, and focused rows", async () => {
    await setup();
    expect(
      page.getByRole("region", { name: "History", exact: true }).element(),
    ).toBeDefined();
    expect(
      page.getByRole("toolbar", { name: "History", exact: true }).element(),
    ).toBeDefined();
    expect(rows()[0]!.getAttribute("aria-label")).toContain("Current version");
    expect(rows()[1]!.getAttribute("aria-label")).toContain("Draft");
  });

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
    await click(page.getByRole("button", { name: "Close", exact: true }));
    expect(editor.domElement!.contains(document.activeElement)).toBe(true);
  });

  it("focuses a remaining row when the focused version is removed", async () => {
    const { editor } = await setup();
    act(() => rows()[1]!.focus());
    await act(async () => {
      await mode(editor).remove(NAMED.id);
    });
    expect(document.activeElement).toBe(rows()[1]);
  });

  it("does not steal focus after a removed version has been left", async () => {
    const { editor } = await setup({ onClose: () => {} });
    const control = page
      .getByRole("button", { name: "Turn on comparison", exact: true })
      .element();
    act(() => {
      rows()[1]!.focus();
      control.focus();
    });
    await act(async () => {
      await mode(editor).remove(NAMED.id);
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
      expect(
        page.getByRole("button", { name, exact: true }).element(),
      ).toBeDefined();
    }
    expect(
      page.getByRole("list", { name: "Versions", exact: true }).element(),
    ).toBeDefined();
  });
});
