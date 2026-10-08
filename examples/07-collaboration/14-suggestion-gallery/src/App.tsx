import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./style.css";

import type { GalleryEditor } from "./gallerySchema";
import {
  createYVersionView,
  type ExperimentalVersionDiffs,
  type VersionDiffFixes,
  versionDiffFixesIncluded,
  SuggestionsExtension,
  withCollaboration,
} from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { useEffect, useState } from "react";

import { ScenarioErrorBoundary } from "./ErrorBoundary";
import { gallerySchema } from "./gallerySchema";
import {
  buildSuggestionScenarioDocs,
  cloneDoc,
  createVersionMerge,
  docFromBlocks,
} from "./scenarioDocs";
import { Feedback, scenarios, SuggestionScenario } from "./scenarios";

type Mode = "suggestions" | "versioning";

// The experimental version diff fixes the Diff can show, none by default as
// in the editor. Kept in the URL, so a link opens the same view.
const FIXES: { value: VersionDiffFixes | undefined; label: string }[] = [
  { value: undefined, label: "Default" },
  { value: "implicitDeleteAttribution", label: "Implicit delete attribution" },
];
const ALL_FIXES: ExperimentalVersionDiffs = {
  versionDiffFixes: FIXES[FIXES.length - 1].value,
};

function readFixes(): ExperimentalVersionDiffs {
  const value = new URLSearchParams(window.location.search).get(
    "versionDiffFixes",
  );
  return {
    versionDiffFixes: FIXES.find((fixes) => fixes.value === value)?.value,
  };
}

function writeFixes(experimental: ExperimentalVersionDiffs) {
  const url = new URL(window.location.href);
  if (experimental.versionDiffFixes) {
    url.searchParams.set("versionDiffFixes", experimental.versionDiffFixes);
  } else {
    url.searchParams.delete("versionDiffFixes");
  }
  window.history.replaceState(null, "", url);
}

// A note with `when` describes the Diff with or without those fixes, so it
// only shows in Versioning mode when they match.
function applies(
  f: Feedback,
  mode: Mode,
  experimental: ExperimentalVersionDiffs,
): boolean {
  if (!f.when) {
    return true;
  }
  const included = experimental.versionDiffFixes
    ? versionDiffFixesIncluded[experimental.versionDiffFixes]
    : [];
  return (
    mode === "versioning" &&
    Object.entries(f.when).every(
      ([fix, on]) => included.some((each) => each === fix) === on,
    )
  );
}

function makeAwareness(doc: Y.Doc, name: string, color: string): Awareness {
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", { name, color });
  return awareness;
}

// Hardcoded to match the attribution-mark palette (the colors BlockNote derives
// per author id "A" / "B"), so a user's pane chrome matches their color in the
// Diff / Merged panes.
const USER_A = { name: "User A", color: "#46525f" };
const USER_B = { name: "User B", color: "#8a6d1a" };

type Renderer = ReturnType<typeof Y.createDiffRenderer>;

type SuggestionAuthor = {
  id: string;
  label: string;
  user: { name: string; color: string };
  apply: (editor: GalleryEditor) => void;
};

/**
 * The authors making suggestions from the base — one for a single scenario, two
 * (A and B) for a concurrent one.
 */
function suggestionAuthors(scenario: SuggestionScenario): SuggestionAuthor[] {
  if (scenario.kind === "single") {
    return [
      {
        id: "A",
        label: "User A (editable)",
        user: USER_A,
        apply: scenario.apply,
      },
    ];
  }
  return [
    {
      id: "A",
      label: "User A (editable)",
      user: USER_A,
      apply: scenario.applyA,
    },
    {
      id: "B",
      label: "User B (editable)",
      user: USER_B,
      apply: scenario.applyB,
    },
  ];
}

/**
 * Suggestions mode for any scenario — Base (read-only) + one editable pane per
 * author + (for a concurrent scenario) a read-only Merged pane that replays every
 * author's suggestions live. Docs are built up front, so each editor just enables
 * suggestion mode and applies its change on mount.
 */
function SuggestionsView({ scenario }: { scenario: SuggestionScenario }) {
  const [setup] = useState(() => {
    const base = docFromBlocks(scenario.initial);
    return { base, baseAwareness: new Awareness(base) };
  });

  const baseEditor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: setup.base.get("doc"),
        provider: { awareness: setup.baseAwareness },
        user: { name: "Base", color: "#888888" },
      },
    }),
  );

  // Editing the base resets the suggestions — remount `<SuggestionPanes>` (fresh
  // clones of the new base, no suggestion re-applied) via the `nonce` key, the
  // same way editing Version 1 resets the versioning view.
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const onBaseEdit = () => setNonce((n) => n + 1);
    setup.base.on("update", onBaseEdit);
    return () => setup.base.off("update", onBaseEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authors = suggestionAuthors(scenario);
  return (
    <div className="bn-gallery-editors">
      <div className="bn-gallery-pane">
        <div className="bn-gallery-pane-label">Base (editable)</div>
        <BlockNoteView editor={baseEditor} />
      </div>
      <SuggestionPanes
        key={nonce}
        base={setup.base}
        authors={authors}
        applyInitial={nonce === 0}
      />
    </div>
  );
}

/**
 * The author panes + (for a concurrent scenario) the Merged pane, built from a
 * snapshot of the base. `applyInitial` applies each author's suggestion on the
 * first build; a reset (base edited) leaves them clean, mirroring the versioning
 * view's user panes.
 */
function SuggestionPanes({
  base,
  authors,
  applyInitial,
}: {
  base: Y.Doc;
  authors: SuggestionAuthor[];
  applyInitial: boolean;
}) {
  const [setup] = useState(() => {
    const docs = buildSuggestionScenarioDocs(
      base,
      authors.map((a) => a.id),
    );
    return {
      baseDoc: docs.baseDoc,
      combined: authors.map((a, i) => ({ ...a, ...docs.authors[i] })),
      merged: docs.merged,
    };
  });

  return (
    <>
      {setup.combined.map((a) => (
        <UserSuggestion
          key={a.id}
          baseDoc={setup.baseDoc}
          suggestionDoc={a.suggestionDoc}
          manager={a.manager}
          user={a.user}
          apply={applyInitial ? a.apply : undefined}
          label={a.label}
        />
      ))}
      {setup.merged && (
        <MergedSuggestion
          baseDoc={setup.baseDoc}
          merged={setup.merged}
          authorDocs={setup.combined.map((a) => ({
            id: a.id,
            doc: a.suggestionDoc,
          }))}
        />
      )}
    </>
  );
}

/**
 * One editable author pane in suggestion mode: enables suggestions + applies the
 * author's change on mount; edits land in `suggestionDoc` as tracked changes.
 */
function UserSuggestion({
  baseDoc,
  suggestionDoc,
  manager,
  user,
  apply,
  label,
}: {
  baseDoc: Y.Doc;
  suggestionDoc: Y.Doc;
  manager: Renderer;
  user: { name: string; color: string };
  apply?: (editor: GalleryEditor) => void;
  label: string;
}) {
  const [setup] = useState(() => ({
    awareness: makeAwareness(baseDoc, user.name, user.color),
  }));

  const editor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: baseDoc.get("doc"),
        provider: { awareness: setup.awareness },
        suggestionDoc,
        renderer: manager,
        user,
      },
    }),
  );

  useEffect(() => {
    editor.getExtension(SuggestionsExtension)!.enableSuggestions();
    apply?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="bn-gallery-pane"
      style={{ borderTopColor: user.color, borderTopWidth: 3 }}
    >
      <div className="bn-gallery-pane-label">{label}</div>
      <BlockNoteView editor={editor} />
    </div>
  );
}

/**
 * The read-only Merged pane (concurrent only): a viewer editor that replays each
 * author's suggestions, forwarded from their docs and tagged by author id, so any
 * new suggestion shows up live.
 */
function MergedSuggestion({
  baseDoc,
  merged,
  authorDocs,
}: {
  baseDoc: Y.Doc;
  merged: { doc: Y.Doc; manager: Renderer };
  authorDocs: { id: string; doc: Y.Doc }[];
}) {
  const [setup] = useState(() => ({ awareness: new Awareness(baseDoc) }));

  const editor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: baseDoc.get("doc"),
        provider: { awareness: setup.awareness },
        suggestionDoc: merged.doc,
        renderer: merged.manager,
        user: { name: "Merged", color: "#666666" },
      },
    }),
  );

  useEffect(() => {
    editor.getExtension(SuggestionsExtension)!.enableSuggestions();
    const offs = authorDocs.map(({ id, doc }) => {
      const onUpdate = (update: Uint8Array) =>
        Y.applyUpdate(merged.doc, update, id);
      doc.on("update", onUpdate);
      return () => doc.off("update", onUpdate);
    });
    // Pull in suggestions already applied on mount.
    authorDocs.forEach(({ id, doc }) =>
      Y.applyUpdate(merged.doc, Y.encodeStateAsUpdate(doc), id),
    );
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bn-gallery-pane">
      <div className="bn-gallery-pane-label">Merged (read-only)</div>
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}

type VersioningUser = {
  id: string;
  label: string;
  user: { name: string; color: string };
  apply: (editor: GalleryEditor) => void;
};

/**
 * The editable "user" versions a scenario merges into Version 2 — one for a
 * single-user scenario, two (A and B) for a concurrent one.
 */
function versioningUsers(scenario: SuggestionScenario): VersioningUser[] {
  if (scenario.kind === "single") {
    return [
      {
        id: "A",
        label: "Version 2 (editable)",
        user: USER_A,
        apply: scenario.apply,
      },
    ];
  }
  return [
    {
      id: "A",
      label: "User A (editable)",
      user: USER_A,
      apply: scenario.applyA,
    },
    {
      id: "B",
      label: "User B (editable)",
      user: USER_B,
      apply: scenario.applyB,
    },
  ];
}

/**
 * Versioning mode for any scenario — Version 1 (base) + one editable pane per
 * "user" + a read-only Diff. Version 2 is the live CRDT merge of the user docs:
 * editing any user re-merges (and re-diffs); editing Version 1 resets every user
 * back to a fresh clone (via the `nonce` remount).
 */
function VersioningView({
  scenario,
  experimental,
}: {
  scenario: SuggestionScenario;
  experimental: ExperimentalVersionDiffs;
}) {
  const [setup] = useState(() => {
    const beforeDoc = docFromBlocks(scenario.initial);
    return {
      beforeDoc,
      beforeAwareness: makeAwareness(beforeDoc, "Version 1", "#888888"),
      users: versioningUsers(scenario),
    };
  });

  const beforeEditor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: setup.beforeDoc.get("doc"),
        provider: { awareness: setup.beforeAwareness },
        user: { name: "Version 1", color: "#888888" },
      },
    }),
  );

  // Editing Version 1 resets the merge — remount `<VersionMerge>` (fresh clones
  // of the new base, no change re-applied) via the `nonce` key.
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const onVersion1Edit = () => setNonce((n) => n + 1);
    setup.beforeDoc.on("update", onVersion1Edit);
    return () => setup.beforeDoc.off("update", onVersion1Edit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bn-gallery-editors">
      <div className="bn-gallery-pane">
        <div className="bn-gallery-pane-label">Version 1 (editable)</div>
        <BlockNoteView editor={beforeEditor} />
      </div>
      <VersionMerge
        key={nonce}
        beforeDoc={setup.beforeDoc}
        users={setup.users}
        applyInitial={nonce === 0}
        experimental={experimental}
      />
    </div>
  );
}

/**
 * The user panes + the Diff. Each user gets an editable editor on its own clone
 * of the base; their edits are forwarded into `afterDoc` (a CRDT merge), which
 * the read-only Diff shows against the base. `applyInitial` applies each user's
 * change on the first build; a reset (Version 1 edited) leaves them clean.
 */
function VersionMerge({
  beforeDoc,
  users,
  applyInitial,
  experimental,
}: {
  beforeDoc: Y.Doc;
  users: VersioningUser[];
  applyInitial: boolean;
  experimental: ExperimentalVersionDiffs;
}) {
  const [setup] = useState(() => {
    // Records which user authored each merged change, so the Diff can color
    // A's and B's contributions in their own colors.
    const merge = createVersionMerge(beforeDoc);
    return {
      userDocs: users.map(() => cloneDoc(beforeDoc)),
      merge,
      afterDoc: merge.doc,
      attrs: merge.attributions,
      diffAwareness: new Awareness(merge.doc),
    };
  });

  const diffEditor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: setup.afterDoc.get("doc"),
        provider: { awareness: setup.diffAwareness },
        user: USER_A,
        experimental,
      },
    }),
  );

  useEffect(() => {
    // Forward every user edit into the merge doc (idempotent CRDT apply), so any
    // change to any user re-diffs.
    const offs = setup.userDocs.map((doc, i) => {
      const onUpdate = (update: Uint8Array) =>
        setup.merge.apply(update, users[i].id);
      doc.on("update", onUpdate);
      return () => doc.off("update", onUpdate);
    });
    // Also pull in any edits that already flushed (the initial applies).
    setup.userDocs.forEach((doc, i) =>
      setup.merge.apply(Y.encodeStateAsUpdate(doc), users[i].id),
    );

    const view = createYVersionView(
      diffEditor,
      setup.afterDoc.get("doc"),
    ).open();
    const renderDiff = () =>
      view.show({
        content: Y.encodeStateAsUpdateV2(setup.afterDoc),
        comparison: {
          content: Y.encodeStateAsUpdateV2(beforeDoc),
          attributions: setup.attrs,
        },
        target: { type: "current" },
      });
    renderDiff();
    setup.afterDoc.on("update", renderDiff);

    return () => {
      offs.forEach((off) => off());
      setup.afterDoc.off("update", renderDiff);
      view.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {users.map((u, i) => (
        <UserVersion
          key={u.id}
          doc={setup.userDocs[i]}
          user={u.user}
          apply={applyInitial ? u.apply : undefined}
          label={u.label}
        />
      ))}
      <div className="bn-gallery-pane">
        <div className="bn-gallery-pane-label">Diff (read-only)</div>
        <BlockNoteView editor={diffEditor} editable={false} />
      </div>
    </>
  );
}

/**
 * One editable "user" version: an editor on `doc` (a base clone), with the
 * scenario change applied on mount (unless this is a reset, when `apply` is
 * omitted). Edits flow into the merge through `doc`.
 */
function UserVersion({
  doc,
  user,
  apply,
  label,
}: {
  doc: Y.Doc;
  user: { name: string; color: string };
  apply?: (editor: GalleryEditor) => void;
  label: string;
}) {
  const [setup] = useState(() => ({
    awareness: makeAwareness(doc, user.name, user.color),
  }));

  const editor = useCreateBlockNote(
    withCollaboration({
      schema: gallerySchema,
      collaboration: {
        fragment: doc.get("doc"),
        provider: { awareness: setup.awareness },
        user,
      },
    }),
  );

  useEffect(() => {
    apply?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="bn-gallery-pane"
      style={{ borderTopColor: user.color, borderTopWidth: 3 }}
    >
      <div className="bn-gallery-pane-label">{label}</div>
      <BlockNoteView editor={editor} />
    </div>
  );
}

const SEVERITY = {
  high: { icon: "🔴", rank: 0 },
  low: { icon: "🟡", rank: 1 },
  info: { icon: "🔵", rank: 2 },
} as const;

// The most-severe note across a scenario's feedback — a known crash counts as
// high — or null if it has none. Drives the sidebar indicator.
function topSeverity(
  s: SuggestionScenario,
  fb: Feedback[],
): "high" | "low" | "info" | null {
  if (s.knownCrash || fb.some((f) => f.severity === "high")) {
    return "high";
  }
  if (fb.some((f) => f.severity === "low")) {
    return "low";
  }
  return fb.some((f) => f.severity === "info") ? "info" : null;
}

function notesFor(
  s: SuggestionScenario,
  mode: Mode,
  experimental: ExperimentalVersionDiffs,
): Feedback[] {
  return (s.feedback ?? []).filter((f) => applies(f, mode, experimental));
}

// The severity without fixes (the default) and, for a scenario the fixes
// affect, in parentheses the severity with all of them (green: no issue left).
// The chosen fixes don't change it.
function severityBadge(s: SuggestionScenario, mode: Mode): string {
  const sev = topSeverity(s, notesFor(s, mode, {}));
  let badge = sev ? SEVERITY[sev].icon + " " : "";
  if (mode === "versioning" && s.feedback?.some((f) => f.when)) {
    const best = topSeverity(s, notesFor(s, mode, ALL_FIXES));
    badge += `(${best === "high" || best === "low" ? SEVERITY[best].icon : "🟢"}) `;
  }
  return badge;
}

export default function App() {
  const [selectedId, setSelectedId] = useState(scenarios[0].id);
  const [mode, setMode] = useState<Mode>("versioning");
  const [experimental, setExperimental] = useState(readFixes);
  const selected = scenarios.find((s) => s.id === selectedId)!;
  const feedback = notesFor(selected, mode, experimental);

  function choose(next: ExperimentalVersionDiffs) {
    writeFixes(next);
    setExperimental(next);
  }

  const categories = [...new Set(scenarios.map((s) => s.category))];

  return (
    <div className="bn-gallery">
      <aside className="bn-gallery-sidebar">
        <h2>Suggestion scenarios</h2>
        {categories.map((category) => (
          <div key={category} className="bn-gallery-category">
            <div className="bn-gallery-category-label">{category}</div>
            {scenarios
              .filter((s) => s.category === category)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={
                    "bn-gallery-item" +
                    (s.id === selectedId ? " bn-gallery-item--active" : "")
                  }
                  onClick={() => setSelectedId(s.id)}
                >
                  {severityBadge(s, mode)}
                  {s.kind === "concurrent" ? "👥 " : ""}
                  {s.title}
                </button>
              ))}
          </div>
        ))}
      </aside>

      <main className="bn-gallery-main">
        <div className="bn-gallery-header">
          <div>
            <h1 className="bn-gallery-title">{selected.title}</h1>
            <p className="bn-gallery-description">{selected.description}</p>
          </div>
          <div className="bn-gallery-modes">
            {(["suggestions", "versioning"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={
                  "bn-gallery-mode" +
                  (mode === m ? " bn-gallery-mode--active" : "")
                }
                onClick={() => setMode(m)}
              >
                {m === "suggestions" ? "Suggestions" : "Versioning"}
              </button>
            ))}
          </div>
        </div>

        {mode === "versioning" && (
          <div className="bn-gallery-experiments">
            Experimental fixes:
            {FIXES.map(({ value, label }) => (
              <label key={label}>
                <input
                  type="radio"
                  name="versionDiffFixes"
                  checked={experimental.versionDiffFixes === value}
                  onChange={() => choose({ versionDiffFixes: value })}
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {feedback.length > 0 && (
          <div className="bn-gallery-feedback">
            <div className="bn-gallery-feedback-title">
              {feedback.some((f) => f.severity !== "info")
                ? "Known issues"
                : "Notes"}
            </div>
            {[...feedback]
              .sort(
                (a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank,
              )
              .map((f, i) => (
                <div
                  key={i}
                  className={`bn-gallery-feedback-item bn-gallery-feedback-item--${f.severity}`}
                >
                  <span className="bn-gallery-feedback-badge">
                    {f.severity}
                  </span>
                  <span>{f.note}</span>
                </div>
              ))}
          </div>
        )}

        <ScenarioErrorBoundary
          key={`${mode}:${selected.id}:${JSON.stringify(experimental)}`}
        >
          {mode === "versioning" ? (
            <VersioningView scenario={selected} experimental={experimental} />
          ) : (
            <SuggestionsView scenario={selected} />
          )}
        </ScenarioErrorBoundary>
      </main>
    </div>
  );
}
