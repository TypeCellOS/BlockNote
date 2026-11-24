import { Awareness } from "@y/protocols/awareness";
import * as Y from "@y/y";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { onTestFinished } from "vite-plus/test";

export function createSuggestionFixtureScope() {
  const docs: Y.Doc[] = [];
  const awareness: Awareness[] = [];
  let host: HTMLElement | undefined;
  let root: Root | undefined;
  let disposed = false;

  // Register before allocating resources or crossing the viewport/render
  // boundary. Own the root here so detachment doesn't depend on the ordering
  // of a shared renderer's cleanup hook (or on render returning successfully).
  onTestFinished(() => {
    disposed = true;
    // Tiptap must not see any of this root's editor hosts during unmount,
    // or it leaves its shared stylesheet installed in the tester document.
    host?.remove();
    try {
      root?.unmount();
    } finally {
      // Detach diff renderers by destroying the suggestion docs first. Y
      // destroys the awareness instances when the base doc is destroyed.
      for (const doc of docs.reverse()) {
        doc.destroy();
      }
    }
  });

  return {
    get awareness(): readonly Awareness[] {
      return awareness;
    },
    createDoc(
      clientID: number,
      options?: ConstructorParameters<typeof Y.Doc>[0],
    ) {
      const doc = new Y.Doc(options);
      docs.push(doc);
      doc.clientID = clientID;
      return doc;
    },
    createAwareness(doc: Y.Doc) {
      const instance = new Awareness(doc);
      awareness.push(instance);
      return instance;
    },
    mount(element: ReactElement) {
      // A viewport command from a timed-out test can resolve after teardown.
      if (disposed) {
        throw new Error("Cannot mount a disposed suggestion fixture");
      }
      host = document.createElement("div");
      document.body.append(host);
      const mountedRoot = createRoot(host);
      root = mountedRoot;
      flushSync(() => mountedRoot.render(element));
    },
  };
}
