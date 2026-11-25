const selector = "style[data-tiptap-style]";

/**
 * Used by suites that mount editors outside the tracked fixture path. Run
 * through host teardown before checking for a sheet left by a direct mount.
 */
export async function withTiptapStyleCleanup(run: () => Promise<void>) {
  const head = document.head;
  const previous = head.querySelector(selector);
  try {
    await run();
  } finally {
    const current = head.querySelector(selector);
    if (current !== previous && !document.querySelector(".tiptap")) {
      current?.remove();
    }
  }
}

type Ownership = {
  leases: number;
  owned: Set<HTMLStyleElement>;
};

const documents = new WeakMap<Document, Ownership>();

/** Hold the shared TipTap stylesheet for one fixture's entire mounted lifetime. */
export function acquireTiptapFixtureStyles(document: Document) {
  const head = document.head;
  const ownership = documents.get(document) ?? {
    leases: 0,
    owned: new Set<HTMLStyleElement>(),
  };
  documents.set(document, ownership);
  ownership.leases++;
  let released = false;

  function track<T>(action: () => T): T {
    const before = new Map(
      Array.from(head.querySelectorAll<HTMLStyleElement>(selector), (sheet) => [
        sheet,
        sheet.nextSibling,
      ]),
    );
    try {
      return action();
    } finally {
      const inserted = Array.from(
        head.querySelectorAll<HTMLStyleElement>(selector),
      ).filter((sheet) => !before.has(sheet));
      for (const sheet of inserted) {
        ownership.owned.add(sheet);
      }
      // TipTap can remove a shared sheet on unmount, even when the view is
      // about to remount (StrictMode/ref replay) or the sheet is borrowed.
      // Restore it ahead of any replacement so future mounts find it first.
      let anchor: Node | null = inserted[0] ?? null;
      for (const [sheet, next] of Array.from(before).reverse()) {
        if (sheet.parentNode !== head) {
          head.insertBefore(sheet, next?.parentNode === head ? next : anchor);
        }
        anchor = sheet;
      }
    }
  }

  return {
    track,
    dispose(teardown: () => void) {
      if (released) {
        return;
      }
      released = true;
      try {
        track(teardown);
      } finally {
        if (--ownership.leases === 0) {
          // A separately mounted editor may still use the sheet. Leave it to
          // that mount; a later fixture must treat it as preexisting.
          if (!document.querySelector(".tiptap")) {
            for (const style of ownership.owned) {
              style.remove();
            }
          }
          documents.delete(document);
        }
      }
    },
  };
}
