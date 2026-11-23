import { expect, onTestFinished, test } from "vite-plus/test";
import { setupConcurrentSuggestionTest } from "./fixtures/concurrentSuggestionFixture.js";
import { setupSuggestionTest } from "./fixtures/suggestionFixture.js";
import { createSuggestionFixtureScope } from "./fixtures/suggestionFixtureScope.js";

test.each([
  {
    name: "single-user",
    size: 2,
    async setup(this: void) {
      const { baseDoc, suggestionDoc, awareness, mountedEditors } =
        await setupSuggestionTest({ userAction: "edit" });
      return { docs: [baseDoc, suggestionDoc], awareness, mountedEditors };
    },
  },
  {
    name: "concurrent",
    size: 4,
    async setup(this: void) {
      const {
        baseDoc,
        suggestionDocA,
        suggestionDocB,
        suggestionDocMerged,
        awareness,
        mountedEditors,
      } = await setupConcurrentSuggestionTest({
        userAAction: "edit",
        userBAction: "edit",
      });
      return {
        docs: [baseDoc, suggestionDocA, suggestionDocB, suggestionDocMerged],
        awareness,
        mountedEditors,
      };
    },
  },
])(
  "$name suggestion fixture unmounts every editor before disposing its Y resources",
  async ({ setup, size }) => {
    let assertDisposed: (() => void) | undefined;
    // Finish hooks are LIFO. Register first to observe the fixture's actual
    // teardown without depending on another case running in this document.
    onTestFinished(() => assertDisposed?.());
    const { docs, awareness, mountedEditors } = await setup();
    const view = document.querySelector('[data-testid="editor-root"]');
    if (!view) {
      throw new Error("Suggestion fixture did not mount");
    }
    expect(view.querySelectorAll(".bn-editor")).toHaveLength(size);
    expect(mountedEditors).toHaveLength(size);
    expect(awareness).toHaveLength(size);
    expect(docs.every((doc) => !doc.isDestroyed)).toBe(true);

    const unmounts = mountedEditors.map(() => 0);
    const observeDisposal = () => ({
      connected: view.isConnected,
      unmounts: [...unmounts],
    });
    const unsubscribe = mountedEditors.map((editor, index) =>
      editor.onUnmount(() => {
        unmounts[index]++;
      }),
    );
    const docDestroyObservations = docs.map((doc) => {
      const observations: ReturnType<typeof observeDisposal>[] = [];
      doc.on("destroy", () => observations.push(observeDisposal()));
      return observations;
    });
    const awarenessDestroyObservations = awareness.map((instance) => {
      const observations: ReturnType<typeof observeDisposal>[] = [];
      instance.on("destroy", () => observations.push(observeDisposal()));
      return observations;
    });
    assertDisposed = () => {
      unsubscribe.forEach((stop) => stop());
      expect(view.isConnected).toBe(false);
      expect(docs.every((doc) => doc.isDestroyed)).toBe(true);
      const expected = { connected: false, unmounts: Array(size).fill(1) };
      expect(docDestroyObservations).toEqual(docs.map(() => [expected]));
      expect(awarenessDestroyObservations).toEqual(
        awareness.map(() => [expected]),
      );
      expect(awareness.map((instance) => instance.getLocalState())).toEqual(
        awareness.map(() => null),
      );
    };
  },
);

test("disposes resources if suggestion setup fails before mounting", () => {
  let assertDisposed: (() => void) | undefined;
  onTestFinished(() => assertDisposed?.());
  const failure = new Error("fixture setup failed");

  expect(() => {
    const scope = createSuggestionFixtureScope();
    const doc = scope.createDoc(1);
    const awareness = scope.createAwareness(doc);
    let destroyed = 0;
    awareness.on("destroy", () => {
      destroyed++;
    });
    assertDisposed = () => {
      expect(doc.isDestroyed).toBe(true);
      expect(destroyed).toBe(1);
      expect(awareness.getLocalState()).toBeNull();
    };
    throw failure;
  }).toThrow(failure);
});
