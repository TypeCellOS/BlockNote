import { useEffect, useRef, useState } from "react";

import "./style.css";
import { USERS } from "./userdata.js";
import { useCurrentUser, setCurrentUser } from "./identity.js";
import { useHashRoute, replaceRoute, navigate } from "./router.js";
import { useDocIndex } from "./docIndex.js";
import { generateRandomId } from "./utils.js";
import { LoginScreen } from "./LoginScreen.js";
import { DocumentList } from "./DocumentList.js";
import { DocumentEditor } from "./DocumentEditor.js";

export default function App() {
  const user = useCurrentUser();
  const segments = useHashRoute();

  // Route table:
  //   []                     -> if logged in, ensure workspace; else login
  //   ['login']              -> login screen
  //   ['w', wsId]            -> workspace, no doc selected
  //   ['w', wsId, docId]     -> workspace + doc editor
  const [seg0, seg1, seg2] = segments;

  useEffect(() => {
    if (user && seg0 !== "w") {
      replaceRoute(`/w/${generateRandomId(10)}`);
    }
  }, [user, seg0]);

  if (!user) {
    return <LoginScreen redirectTo={window.location.hash.slice(1) || "/"} />;
  }

  if (seg0 !== "w" || !seg1) {
    return <div className="page-loading">Loading...</div>;
  }

  const workspaceId = seg1;
  const docId = seg2 || null;

  return <Workspace user={user} workspaceId={workspaceId} docId={docId} />;
}

function Workspace({
  user,
  workspaceId,
  docId,
}: {
  user: (typeof USERS)[0];
  workspaceId: string;
  docId: string | null;
}) {
  const index = useDocIndex();
  const activeDoc = docId ? index.docs.find((d) => d.id === docId) : null;
  const [copied, setCopied] = useState(false);

  // A shared doc URL can reference a doc this browser has never seen (the
  // index is localStorage-only). Register it so the editor mounts and syncs
  // the content from the server. Ensure each id at most once per mount so
  // deleting the currently open doc doesn't immediately re-create it.
  const ensuredDocIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!docId || activeDoc || ensuredDocIdsRef.current.has(docId)) {
      return;
    }
    ensuredDocIdsRef.current.add(docId);
    index.ensure(docId);
  }, [docId, activeDoc, index]);

  const share = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    const url = new URL(window.location.href);
    // Don't embed the sharer's identity — identity is per-tab, so the opening
    // tab should pick (or keep) its own user.
    url.searchParams.delete("as");
    url.hash = activeDoc
      ? `/w/${workspaceId}/${activeDoc.id}`
      : `/w/${workspaceId}`;
    const link = url.toString();
    navigator.clipboard?.writeText(link).catch(() => {
      window.prompt(
        activeDoc
          ? "Copy this URL to share the document"
          : "Copy this URL to share the workspace",
        link,
      );
    });
  };

  const signOut = () => {
    setCurrentUser(null);
    navigate("/");
  };

  const switchUser = (id: string) => {
    if (id === user.id) {
      return;
    }
    setCurrentUser(id);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="workspace-badge" title="Workspace ID">
            <span className="workspace-badge-dot" />
            {workspaceId}
          </span>
          {activeDoc && <span className="app-header-sep">/</span>}
          {activeDoc && (
            <span className="app-header-doctitle">{activeDoc.title}</span>
          )}
        </div>
        <div className="app-header-right">
          <button
            className="btn btn-sm"
            onClick={share}
            title={activeDoc ? "Copy document URL" : "Copy workspace URL"}
          >
            {copied
              ? "Link copied"
              : activeDoc
                ? "Share document"
                : "Share workspace"}
          </button>
          <UserMenu user={user} onSwitch={switchUser} onSignOut={signOut} />
        </div>
      </header>
      <div className="app-body">
        <DocumentList
          index={index}
          workspaceId={workspaceId}
          activeDocId={docId}
        />
        {activeDoc ? (
          <DocumentEditor
            key={activeDoc.id + user.id}
            workspaceId={workspaceId}
            docId={activeDoc.id}
            user={user}
            docTitle={activeDoc.title}
            onTouch={() => index.touch(activeDoc.id)}
          />
        ) : (
          <EmptyDocPane
            hasDocs={index.docs.length > 0}
            onCreate={() => {
              const id = index.create();
              if (id) {
                navigate(`/w/${workspaceId}/${id}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function UserMenu({
  user,
  onSwitch,
  onSignOut,
}: {
  user: (typeof USERS)[0];
  onSwitch: (id: string) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    onSwitch(id);
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        className="user-pill"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch user"
      >
        <span className="user-avatar" style={{ backgroundColor: user.color }}>
          {user.username[0]}
        </span>
        <span className="user-name">{user.username}</span>
        <span className="user-caret" aria-hidden="true">
          &#x25BE;
        </span>
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-label">Switch user</div>
          {USERS.map((u) => {
            const isCurrent = u.id === user.id;
            return (
              <button
                key={u.id}
                className="user-menu-item"
                role="menuitemradio"
                aria-checked={isCurrent}
                onClick={() => pick(u.id)}
              >
                <span
                  className="user-avatar"
                  style={{ backgroundColor: u.color }}
                >
                  {u.username[0]}
                </span>
                <span className="user-menu-item-name">{u.username}</span>
                {isCurrent && (
                  <span className="user-menu-check" aria-hidden="true">
                    &#x2713;
                  </span>
                )}
              </button>
            );
          })}
          <div className="user-menu-divider" />
          <button
            className="user-menu-item user-menu-item-signout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyDocPane({
  hasDocs,
  onCreate,
}: {
  hasDocs: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="doc-empty">
      <div className="doc-empty-inner">
        <h2 className="doc-empty-title">
          {hasDocs ? "Pick a document from the sidebar" : "No documents yet"}
        </h2>
        <p className="doc-empty-sub">
          {hasDocs
            ? "Or create a new one to start writing."
            : "Create your first document to start writing and collaborating."}
        </p>
        <button className="btn btn-primary" onClick={onCreate}>
          + New document
        </button>
      </div>
    </section>
  );
}
