import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

/** Keeps the editor read-only and the loader visible until every token is released. */
export const LoadingExtension = createExtension(({ editor }) => {
  const store = createStore(new Set<symbol>());

  return {
    key: "loading",
    store,
    acquire() {
      const token = Symbol();
      const releaseEditingLock = editor.acquireEditingLock();
      store.setState(new Set([...store.state, token]));
      return function release() {
        if (store.state.has(token)) {
          const tokens = new Set(store.state);
          tokens.delete(token);
          releaseEditingLock();
          store.setState(tokens);
        }
      };
    },
    mount({ dom, signal }) {
      function update() {
        dom.classList.toggle("bn-loading", store.state.size > 0);
      }
      update();
      const unsubscribe = store.subscribe(update);
      signal.addEventListener(
        "abort",
        () => {
          unsubscribe();
          dom.classList.remove("bn-loading");
        },
        { once: true },
      );
    },
  };
});
