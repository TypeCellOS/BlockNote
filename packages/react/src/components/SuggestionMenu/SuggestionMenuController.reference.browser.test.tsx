import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import type { VirtualElement } from "@floating-ui/react";
import { act } from "react";
import {
  aroundEach,
  describe,
  expect,
  type TestContext,
  vi,
} from "vite-plus/test";
import { createSetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";

import type { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SuggestionMenuController } from "./SuggestionMenuController.js";
import { SuggestionMenuPopover } from "./SuggestionMenuPopover.js";
import { suggestionMenuMiddleware } from "./suggestionMenuMiddleware.js";

aroundEach(async (runTest) => {
  const key = "IS_REACT_ACT_ENVIRONMENT";
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(
    globalThis,
    key,
    previous ? { value: true } : { value: true, configurable: true },
  );
  try {
    await runTest();
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, key, previous);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
});

function setupEditorWithAct(onTestFinished: TestContext["onTestFinished"]) {
  // Unmounting the fixture also tears down the open popover and its editor
  // subscriptions. Flush those React updates while disposing this editor.
  return createSetupEditor((dispose) => {
    onTestFinished((context) => act(async () => dispose(context)));
  });
}

function createReferenceProbe() {
  const installed: VirtualElement[] = [];
  const measured: {
    reference: VirtualElement;
    rect: ReturnType<VirtualElement["getBoundingClientRect"]>;
  }[] = [];
  let updatePosition: (() => void) | undefined;
  const floatingUIOptions: FloatingUIOptions = {
    useFloatingOptions: {
      middleware: [
        {
          name: "observeSuggestionReference",
          fn({ elements: { reference } }) {
            if ("contextElement" in reference) {
              // Floating UI passes the installed virtual element through.
              measured.push({
                reference,
                rect: reference.getBoundingClientRect(),
              });
            }
            return {};
          },
        },
        ...suggestionMenuMiddleware,
      ],
      whileElementsMounted(reference, _floating, update) {
        if ("contextElement" in reference) {
          installed.push(reference);
          updatePosition = update;
        }
        return () => {
          if (updatePosition === update) {
            updatePosition = undefined;
          }
        };
      },
    },
  };

  async function measureReference(x: number) {
    const start = measured.length;
    await act(async () => updatePosition?.());
    return vi.waitFor(() => {
      const reference = installed.at(-1);
      const observation = measured
        .slice(start)
        .findLast((entry) => entry.reference === reference);
      expect(observation?.rect).toMatchObject({
        x,
        y: 20,
        width: 8,
        height: 16,
      });
      return observation!.reference;
    });
  }

  return { floatingUIOptions, installed, measureReference };
}

// Only the trigger decoration in this editor has fixed geometry. Each query
// still measures it anew through the real suggestion menu extension.
const domAttributes = { editor: { "data-reference-probe": "" } };
const decorationStyle = (
  <style>{`
    [data-reference-probe] .bn-suggestion-decorator {
      position: fixed;
      left: var(--reference-probe-x, 10px);
      top: 20px;
      width: 8px;
      height: 16px;
    }
  `}</style>
);

async function expectStableReferenceDuringQuery(
  editor: BlockNoteEditor,
  rootNode: HTMLElement,
  triggerCharacter: "/" | ":",
  probe: ReturnType<typeof createReferenceProbe>,
  type: (text: string) => Promise<void>,
  seenQuery: (query: string) => void,
) {
  const suggestionMenu = editor.getExtension(SuggestionMenu)!;
  await act(async () => {
    editor.focus();
    await type(triggerCharacter);
  });
  const initial = await probe.measureReference(10);
  expect(initial.contextElement).toBe(editor.domElement?.firstElementChild);
  const initialInstallCount = probe.installed.length;
  let previousRect = suggestionMenu.store.state?.referencePos;
  let query = "";
  for (const character of "query") {
    query += character;
    await act(async () => {
      await type(character);
    });
    const state = suggestionMenu.store.state;
    expect(state).toMatchObject({ show: true, triggerCharacter, query });
    expect(state?.referencePos).not.toBe(previousRect);
    previousRect = state?.referencePos;
    seenQuery(query);
    expect(await probe.measureReference(10)).toBe(initial);
  }
  for (const reference of probe.installed.slice(initialInstallCount)) {
    expect(reference).toBe(initial);
  }

  await act(async () => {
    rootNode.style.setProperty("--reference-probe-x", "40px");
    await type("!");
  });
  expect(suggestionMenu.store.state).toMatchObject({
    show: true,
    triggerCharacter,
    query: "query!",
  });
  seenQuery("query!");
  const moved = await probe.measureReference(40);
  expect(moved).not.toBe(initial);
  expect(moved.contextElement).toBe(initial.contextElement);
}

describe("suggestion menu reference", () => {
  it("keeps the list menu reference while the menu does not move", async ({
    onTestFinished,
    userEvent,
  }) => {
    const probe = createReferenceProbe();
    const getItems = vi.fn(async (query: string) => [
      { title: `Result for ${query}`, onItemClick: () => {} },
    ]);
    const { editor, rootNode } = await act(() =>
      setupEditorWithAct(onTestFinished)({
        skin: "raw",
        domAttributes,
        props: { slashMenu: false, emojiPicker: false },
        children: (
          <>
            {decorationStyle}
            <SuggestionMenuController
              triggerCharacter="/"
              floatingUIOptions={probe.floatingUIOptions}
              getItems={getItems}
              suggestionMenuComponent={() => <div />}
            />
          </>
        ),
      }),
    );

    await expectStableReferenceDuringQuery(
      editor,
      rootNode,
      "/",
      probe,
      (text) => userEvent.keyboard(text),
      (query) => {
        expect(getItems).toHaveBeenLastCalledWith(query);
      },
    );
  });

  it("keeps the shared emoji popover reference while the menu does not move", async ({
    onTestFinished,
    userEvent,
  }) => {
    const probe = createReferenceProbe();
    // Query changes are observed without resizing the floating element.
    const renderQuery = vi.fn((_query: string) => null);
    const { editor, rootNode } = await act(() =>
      setupEditorWithAct(onTestFinished)({
        skin: "raw",
        domAttributes,
        props: { slashMenu: false, emojiPicker: false },
        children: (
          <>
            {decorationStyle}
            <SuggestionMenuPopover
              triggerCharacter=":"
              floatingUIOptions={probe.floatingUIOptions}
            >
              {({ query }) => renderQuery(query)}
            </SuggestionMenuPopover>
          </>
        ),
      }),
    );

    await expectStableReferenceDuringQuery(
      editor,
      rootNode,
      ":",
      probe,
      (text) => userEvent.keyboard(text),
      (query) => {
        expect(renderQuery).toHaveBeenLastCalledWith(query);
      },
    );
  });
});
