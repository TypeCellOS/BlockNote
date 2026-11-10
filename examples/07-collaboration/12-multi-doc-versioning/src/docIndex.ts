import { useCallback, useEffect, useMemo, useState } from "react";

import { generateDocTitle, generateRandomId } from "./utils.js";
import { YHUB_API_URL } from "./yhub.js";

export type DocEntry = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "bn-multi-doc-index";

function storageKey(workspaceId: string) {
  return `${STORAGE_KEY}:${workspaceId}`;
}

function readStoredDocs(key: string): DocEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const docs = JSON.parse(raw) as DocEntry[];
    return docs.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

function writeDocs(workspaceId: string, docs: DocEntry[]) {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(docs));
}

/** Copy legacy entries only when a seed plan or an open URL identifies their
 * workspace. Keep the old index intact: other entries have no ownership data
 * and must not be silently reassigned to whichever workspace opens first. */
export function readDocIndex(
  workspaceId: string,
  activeDocId: string | null = null,
) {
  const docs = readStoredDocs(storageKey(workspaceId));
  if (localStorage.getItem(storageKey(workspaceId)) !== null) {
    return docs;
  }
  const legacy = readStoredDocs(STORAGE_KEY);
  const knownIds = new Set(activeDocId ? [activeDocId] : []);
  const savedSeed = localStorage.getItem(
    `bn-multi-doc-seed:${YHUB_API_URL}/${workspaceId}`,
  );
  if (savedSeed) {
    const plan: unknown = JSON.parse(savedSeed);
    if (
      typeof plan === "object" &&
      plan !== null &&
      "docId" in plan &&
      typeof plan.docId === "string"
    ) {
      knownIds.add(plan.docId);
      // The durable plan identifies the old seeded workspace even when its
      // sample was subsequently deleted from the legacy index.
      if (localStorage.getItem("bn-multi-doc-seeded")) {
        localStorage.setItem(`bn-multi-doc-seeded:${workspaceId}`, "1");
      }
    }
  }
  for (const doc of legacy) {
    if (knownIds.has(doc.id) && !docs.some((entry) => entry.id === doc.id)) {
      docs.push(doc);
    }
  }
  // Record even an empty index so deleting a migrated entry cannot import it
  // again from the preserved legacy copy.
  writeDocs(workspaceId, docs);
  return docs.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Simple localStorage-backed document index. Provides create, rename, delete,
 * and touch (update timestamp) operations. Uses a custom event to sync across
 * hook instances within the same tab.
 */
export function useDocIndex(workspaceId: string, activeDocId: string | null) {
  const [docs, setDocs] = useState(() =>
    readDocIndex(workspaceId, activeDocId),
  );

  // Listen for changes from other calls within the same tab
  useEffect(() => {
    const handler = () => setDocs(readDocIndex(workspaceId));
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(workspaceId)) {
        handler();
      }
    };
    window.addEventListener("bn-doc-index-change", handler);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bn-doc-index-change", handler);
      window.removeEventListener("storage", onStorage);
    };
  }, [workspaceId]);

  const notify = useCallback(() => {
    window.dispatchEvent(new Event("bn-doc-index-change"));
  }, []);

  const create = useCallback(
    (title?: string): string => {
      const id = generateRandomId(6);
      const now = Date.now();
      const entry: DocEntry = {
        id,
        title: title ?? generateDocTitle(),
        createdAt: now,
        updatedAt: now,
      };
      const current = readDocIndex(workspaceId);
      current.push(entry);
      writeDocs(workspaceId, current);
      notify();
      return id;
    },
    [notify, workspaceId],
  );

  // Registers a doc id that arrived via a shared URL but isn't in this
  // browser's index yet. The index is local-only, while doc contents live on
  // the collaboration server — so a placeholder entry is enough to open it.
  const ensure = useCallback(
    (id: string, title?: string) => {
      const current = readDocIndex(workspaceId);
      if (current.some((d) => d.id === id)) {
        return;
      }
      const now = Date.now();
      current.push({
        id,
        // An explicit shared URL identifies this document's workspace, even
        // if the scoped index was created before that URL was opened.
        title:
          title ??
          readStoredDocs(STORAGE_KEY).find((doc) => doc.id === id)?.title ??
          "Shared document",
        createdAt: now,
        updatedAt: now,
      });
      writeDocs(workspaceId, current);
      notify();
    },
    [notify, workspaceId],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      const current = readDocIndex(workspaceId);
      const entry = current.find((d) => d.id === id);
      if (!entry) {
        return;
      }
      entry.title = title;
      entry.updatedAt = Date.now();
      writeDocs(workspaceId, current);
      notify();
    },
    [notify, workspaceId],
  );

  const remove = useCallback(
    (id: string) => {
      const current = readDocIndex(workspaceId).filter((d) => d.id !== id);
      writeDocs(workspaceId, current);
      // Also clean up versioning data for this doc
      try {
        localStorage.removeItem(`bn-versioning-${id}`);
        localStorage.removeItem(`bn-versioning-${id}-contents`);
      } catch {
        /* ignore */
      }
      notify();
    },
    [notify, workspaceId],
  );

  const touch = useCallback(
    (id: string) => {
      const current = readDocIndex(workspaceId);
      const entry = current.find((d) => d.id === id);
      if (!entry) {
        return;
      }
      entry.updatedAt = Date.now();
      writeDocs(workspaceId, current);
      notify();
    },
    [notify, workspaceId],
  );

  return useMemo(
    () => ({ docs, create, ensure, rename, remove, touch }),
    [docs, create, ensure, rename, remove, touch],
  );
}
