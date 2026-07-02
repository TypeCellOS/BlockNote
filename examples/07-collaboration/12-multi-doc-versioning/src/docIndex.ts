import { useCallback, useEffect, useMemo, useState } from "react";

import { generateDocTitle, generateRandomId } from "./utils.js";

export type DocEntry = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "bn-multi-doc-index";

function readDocs(): DocEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const docs = JSON.parse(raw) as DocEntry[];
    return docs.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

function writeDocs(docs: DocEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

/**
 * Simple localStorage-backed document index. Provides create, rename, delete,
 * and touch (update timestamp) operations. Uses a custom event to sync across
 * hook instances within the same tab.
 */
export function useDocIndex() {
  const [docs, setDocs] = useState(readDocs);

  // Listen for changes from other calls within the same tab
  useEffect(() => {
    const handler = () => setDocs(readDocs());
    window.addEventListener("bn-doc-index-change", handler);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        handler();
      }
    });
    return () => {
      window.removeEventListener("bn-doc-index-change", handler);
    };
  }, []);

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
      const current = readDocs();
      current.push(entry);
      writeDocs(current);
      notify();
      return id;
    },
    [notify],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      const current = readDocs();
      const entry = current.find((d) => d.id === id);
      if (!entry) {
        return;
      }
      entry.title = title;
      entry.updatedAt = Date.now();
      writeDocs(current);
      notify();
    },
    [notify],
  );

  const remove = useCallback(
    (id: string) => {
      const current = readDocs().filter((d) => d.id !== id);
      writeDocs(current);
      // Also clean up versioning data for this doc
      try {
        localStorage.removeItem(`bn-versioning-${id}`);
        localStorage.removeItem(`bn-versioning-${id}-contents`);
      } catch {
        /* ignore */
      }
      notify();
    },
    [notify],
  );

  const touch = useCallback(
    (id: string) => {
      const current = readDocs();
      const entry = current.find((d) => d.id === id);
      if (!entry) {
        return;
      }
      entry.updatedAt = Date.now();
      writeDocs(current);
      notify();
    },
    [notify],
  );

  return useMemo(
    () => ({ docs, create, rename, remove, touch }),
    [docs, create, rename, remove, touch],
  );
}
