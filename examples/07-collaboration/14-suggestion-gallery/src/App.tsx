import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./style.css";

import type { BlockNoteEditor } from "@blocknote/core";
import {
  createYjsVersioningAdapter,
  SuggestionsExtension,
  withCollaboration,
} from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import { useEffect, useState } from "react";

import { ScenarioErrorBoundary } from "./ErrorBoundary";
import {
  buildSuggestionScenarioDocs,
  cloneDoc,
  createAttributionStore,
  docFromBlocks,
} from "./scenarioDocs";
import { scenarios, SuggestionScenario } from "./scenarios";

type Mode = "suggestions" | "versioning";

function makeAwareness(doc: Y.Doc, name: string, color: string): Awareness {
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", { name, color });
  return awareness;
}

// Hardcoded to match the attribution-mark palette (the colors BlockNote derives
// per author id "A" / "B"), so a user's pane chrome matches their color in the
// Diff / Merged panes.
const USER_A = { name: "User A", color: "#8a6d1a" };
const USER_B = { name: "User B", color: "#8a2e24" };

type AttributionManager = ReturnType<typeof Y.createAttributionManagerFromDiff>;

type SuggestionAuthor = {
  id: string;
  label: string;
  user: { name: string; color: string };
  apply: (editor: BlockNoteEditor) => void;
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
  const paneCount = 1 + authors.length + (authors.length > 1 ? 1 : 0);
  return (
    <div
      className={
        "bn-gallery-editors" +
        (paneCount >= 4 ? " bn-gallery-editors--four" : "")
      }
    >
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
  manager: AttributionManager;
  user: { name: string; color: string };
  apply?: (editor: BlockNoteEditor) => void;
  label: string;
}) {
  const [setup] = useState(() => ({
    awareness: makeAwareness(baseDoc, user.name, user.color),
  }));

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment: baseDoc.get("doc"),
        provider: { awareness: setup.awareness },
        suggestionDoc,
        attributionManager: manager,
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
      <div className="bn-gallery-pane-label" style={{ color: user.color }}>
        {label}
      </div>
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
  merged: { doc: Y.Doc; manager: AttributionManager };
  authorDocs: { id: string; doc: Y.Doc }[];
}) {
  const [setup] = useState(() => ({ awareness: new Awareness(baseDoc) }));

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment: baseDoc.get("doc"),
        provider: { awareness: setup.awareness },
        suggestionDoc: merged.doc,
        attributionManager: merged.manager,
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
  apply: (editor: BlockNoteEditor) => void;
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
function VersioningView({ scenario }: { scenario: SuggestionScenario }) {
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
    <div
      className={
        "bn-gallery-editors " +
        (setup.users.length > 1
          ? "bn-gallery-editors--four"
          : "bn-gallery-editors--three")
      }
    >
      <div className="bn-gallery-pane">
        <div className="bn-gallery-pane-label">Version 1 (editable)</div>
        <BlockNoteView editor={beforeEditor} />
      </div>
      <VersionMerge
        key={nonce}
        beforeDoc={setup.beforeDoc}
        users={setup.users}
        applyInitial={nonce === 0}
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
}: {
  beforeDoc: Y.Doc;
  users: VersioningUser[];
  applyInitial: boolean;
}) {
  const [setup] = useState(() => {
    const afterDoc = cloneDoc(beforeDoc);
    const ids = new Set(users.map((u) => u.id));
    // Record which user authored each merged change (by the Yjs origin the
    // edits are forwarded with), so the Diff can color A's and B's
    // contributions in their own colors instead of one flat diff color.
    const attrs = createAttributionStore(afterDoc, (tr) =>
      ids.has(String(tr.origin)) ? String(tr.origin) : null,
    );
    return {
      userDocs: users.map(() => cloneDoc(beforeDoc)),
      afterDoc,
      attrs,
      diffAwareness: new Awareness(afterDoc),
    };
  });

  const diffEditor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        fragment: setup.afterDoc.get("doc"),
        provider: { awareness: setup.diffAwareness },
        user: USER_A,
      },
    }),
  );

  useEffect(() => {
    // Forward every user edit into the merge doc (idempotent CRDT apply), so any
    // change to any user re-diffs.
    // Forward with the author's id as the Yjs origin so the attribution store
    // tags each merged change with its author.
    const offs = setup.userDocs.map((doc, i) => {
      const origin = users[i].id;
      const onUpdate = (update: Uint8Array) =>
        Y.applyUpdate(setup.afterDoc, update, origin);
      doc.on("update", onUpdate);
      return () => doc.off("update", onUpdate);
    });
    // Also pull in any edits that already flushed (the initial applies).
    setup.userDocs.forEach((doc, i) =>
      Y.applyUpdate(setup.afterDoc, Y.encodeStateAsUpdate(doc), users[i].id),
    );

    const adapter = createYjsVersioningAdapter(
      diffEditor,
      setup.afterDoc.get("doc"),
    );
    const renderDiff = () =>
      adapter.preview.enterPreview(
        Y.encodeStateAsUpdateV2(setup.afterDoc),
        Y.encodeStateAsUpdateV2(beforeDoc),
        setup.attrs,
      );
    renderDiff();
    setup.afterDoc.on("update", renderDiff);

    return () => {
      offs.forEach((off) => off());
      setup.afterDoc.off("update", renderDiff);
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
  apply?: (editor: BlockNoteEditor) => void;
  label: string;
}) {
  const [setup] = useState(() => ({
    awareness: makeAwareness(doc, user.name, user.color),
  }));

  const editor = useCreateBlockNote(
    withCollaboration({
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
      <div className="bn-gallery-pane-label" style={{ color: user.color }}>
        {label}
      </div>
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
function topSeverity(s: SuggestionScenario): "high" | "low" | "info" | null {
  const fb = s.feedback ?? [];
  if (s.knownCrash || fb.some((f) => f.severity === "high")) {
    return "high";
  }
  if (fb.some((f) => f.severity === "low")) {
    return "low";
  }
  return fb.some((f) => f.severity === "info") ? "info" : null;
}

function severityBadge(s: SuggestionScenario): string {
  const sev = topSeverity(s);
  return sev ? " " + SEVERITY[sev].icon : "";
}

export default function App() {
  const [selectedId, setSelectedId] = useState(scenarios[0].id);
  const [mode, setMode] = useState<Mode>("versioning");
  const selected = scenarios.find((s) => s.id === selectedId)!;

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
                  {s.title}
                  {s.kind === "concurrent" ? " 👥" : ""}
                  {severityBadge(s)}
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

        {selected.feedback && selected.feedback.length > 0 && (
          <div className="bn-gallery-feedback">
            <div className="bn-gallery-feedback-title">
              {selected.feedback.some((f) => f.severity !== "info")
                ? "Known issues"
                : "Notes"}
            </div>
            {[...selected.feedback]
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

        <ScenarioErrorBoundary key={`${mode}:${selected.id}`}>
          {mode === "versioning" ? (
            <VersioningView scenario={selected} />
          ) : (
            <SuggestionsView scenario={selected} />
          )}
        </ScenarioErrorBoundary>
      </main>
    </div>
  );
}
