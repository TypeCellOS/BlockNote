import { combineByGroup, createUserStore } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { withCollaboration, YjsThreadStore } from "@blocknote/core/yjs";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { en } from "@blocknote/core/locales";
import { syntaxHighlighter } from "@blocknote/code-block";
import {
  getMathBlockTypeSelectItems,
  getMathSlashMenuItems,
  locales as mathLocales,
} from "@blocknote/math-block";
import {
  getDiagramBlockTypeSelectItems,
  getDiagramSlashMenuItems,
  locales as diagramLocales,
} from "@blocknote/diagram-block";
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as columnLocales,
} from "@blocknote/xl-multi-column";
import { BlockNoteView } from "@blocknote/mantine";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  FormattingToolbar,
  FormattingToolbarController,
  blockTypeSelectItems,
} from "@blocknote/react";
import { useEffect, useMemo, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/math-block/style.css";
import { schema } from "./schema.js";
import { presets } from "./documents/index.js";
import { createSession, type Session } from "./session.js";
import { PdfPreview } from "./PdfPreview.js";
import { Shortcuts } from "./Shortcuts.js";
import "./style.css";

// Store uploads in the shared document as data URLs; no upload server is needed.
async function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        throw new Error("Expected a data URL");
      }

      resolve(reader.result);
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [session, setSession] = useState<Session>();

  useEffect(() => {
    let disposed = false;
    let active: Session | undefined;

    // Initialization can finish after unmount, including during Strict Mode setup.
    void createSession().then((created) => {
      if (disposed) {
        created.destroy();
      } else {
        active = created;
        setSession(created);
      }
    });

    return () => {
      disposed = true;
      active?.destroy();
    };
  }, []);

  return session ? (
    <KitchenSink session={session} />
  ) : (
    <p role="status">Opening document…</p>
  );
}

function KitchenSink({ session }: { session: Session }) {
  const [editable, setEditable] = useState(true);
  const [dark, setDark] = useState(false);
  const [format, setFormat] = useState("none");

  const settings = session.doc.getMap<string>("settings");
  const [preset, setPreset] = useState(
    () => settings.get("preset") ?? "standard",
  );

  useEffect(() => {
    function update() {
      setPreset(settings.get("preset") ?? "standard");
    }

    settings.observe(update);

    return () => settings.unobserve(update);
  }, [settings]);

  // Share comment threads through Yjs and resolve the same users for comments and cursors.
  const { threadStore, userStore } = useMemo(
    () => ({
      threadStore: new YjsThreadStore(
        session.user.id,
        session.doc.getMap("threads"),
        new DefaultThreadStoreAuth(session.user.id, "editor"),
      ),
      userStore: createUserStore(async (ids) =>
        ids.map((id) => ({
          id,
          username: `User ${id.slice(0, 4)}`,
          avatarUrl: "",
        })),
      ),
    }),
    [session],
  );

  const editor = useCreateBlockNote(
    withCollaboration({
      schema,
      uploadFile,
      dropCursor: multiColumnDropCursor,
      dictionary: {
        ...en,
        math: mathLocales.en,
        diagram: diagramLocales.en,
        multi_column: columnLocales.en,
      },
      tables: {
        splitCells: true,
        cellBackgroundColor: true,
        cellTextColor: true,
        headers: true,
      },
      collaboration: {
        provider: session,
        fragment: session.doc.getXmlFragment("blocknote"),
        user: { name: session.user.username, color: session.color },
        resolveUsers: userStore,
      },
      extensions: [
        syntaxHighlighter,
        CommentsExtension({ threadStore, resolveUsers: userStore }),
      ],
    }),
    [session, threadStore, userStore],
  );

  return (
    <div className="kitchen-sink" data-theme={dark ? "dark" : "light"}>
      <aside className="kitchen-sink-options" aria-label="Editor options">
        <header className="kitchen-sink-brand">
          <h1 className="kitchen-sink-title">BlockNote Features Demo</h1>
        </header>

        <div className="kitchen-sink-settings-group">
          <h2 className="kitchen-sink-group-title">Appearance</h2>
          <label className="kitchen-sink-toggle">
            Editable
            <input
              className="kitchen-sink-checkbox"
              type="checkbox"
              checked={editable}
              onChange={(event) => setEditable(event.target.checked)}
            />
          </label>
          <label className="kitchen-sink-toggle">
            Dark mode
            <input
              className="kitchen-sink-checkbox"
              type="checkbox"
              checked={dark}
              onChange={(event) => setDark(event.target.checked)}
            />
          </label>
        </div>

        <div className="kitchen-sink-settings-group">
          <h2 className="kitchen-sink-group-title">Collaboration</h2>
          <p className="kitchen-sink-identity">
            <span className="kitchen-sink-avatar" aria-hidden="true">
              {session.user.username.slice(-2).toUpperCase()}
            </span>
            {session.user.username}
          </p>
          <p className="kitchen-sink-help">
            Open this page in another tab or window to edit as a different user
            and see changes in real time.
          </p>
          <a
            className="kitchen-sink-button"
            href={session.href}
            target="_blank"
            rel="noreferrer"
          >
            Open another collaborator tab <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="kitchen-sink-settings-group">
          <label className="kitchen-sink-field">
            Document
            <select
              className="kitchen-sink-select"
              value={preset}
              aria-describedby="kitchen-sink-document-help"
              onChange={(event) => {
                const selected = presets.find(
                  (entry) => entry.id === event.target.value,
                );

                if (!selected) {
                  return;
                }

                // Replace the content, comments, and preset selection together in every tab.
                session.doc.transact(() => {
                  editor.replaceBlocks(editor.document, selected.blocks);
                  session.doc.getMap("threads").clear();
                  settings.set("preset", selected.id);
                });
              }}
            >
              {presets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <p className="kitchen-sink-help" id="kitchen-sink-document-help">
            Changing documents replaces all content in the editor, including
            comments.
          </p>
          <label className="kitchen-sink-field">
            Export
            <select
              className="kitchen-sink-select"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            >
              <option value="none">None</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
        </div>
      </aside>

      <main className="kitchen-sink-main">
        <div className="kitchen-sink-views">
          <section className="kitchen-sink-editor" aria-label="Document editor">
            <header className="kitchen-sink-panel-header">
              <h2 className="kitchen-sink-panel-title">Document editor</h2>
              <span className="kitchen-sink-badge">
                {editable ? "Editable" : "Read only"}
              </span>
            </header>
            <div className="kitchen-sink-editor-scroll">
              <BlockNoteView
                editor={editor}
                editable={editable}
                theme={dark ? "dark" : "light"}
                slashMenu={false}
                formattingToolbar={false}
              >
                <FormattingToolbarController
                  formattingToolbar={() => (
                    <FormattingToolbar
                      blockTypeSelectItems={[
                        ...blockTypeSelectItems(editor),
                        ...getMathBlockTypeSelectItems(editor),
                        ...getDiagramBlockTypeSelectItems(editor),
                      ]}
                    />
                  )}
                />
                <SuggestionMenuController
                  triggerCharacter="/"
                  getItems={async (query) =>
                    filterSuggestionItems(
                      combineByGroup(
                        getDefaultReactSlashMenuItems(editor),
                        getPageBreakReactSlashMenuItems(editor),
                        getMultiColumnSlashMenuItems(editor),
                        getMathSlashMenuItems(editor),
                        getDiagramSlashMenuItems(editor),
                      ),
                      query,
                    )
                  }
                />
              </BlockNoteView>
            </div>
          </section>
          {format === "pdf" && <PdfPreview editor={editor} />}
        </div>
        <Shortcuts />
      </main>
    </div>
  );
}
