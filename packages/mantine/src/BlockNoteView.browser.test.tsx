/* eslint-disable react/globals -- The test component exposes a rerender callback to its parent test. */
import type { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
  getDefaultReactSlashMenuItems,
  type PortalElementsMap,
  SuggestionMenuController,
} from "@blocknote/react";
import { act, Profiler, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  aroundEach,
  beforeEach,
  describe,
  expect,
  vi,
} from "vite-plus/test";
import type { SetupEditor } from "../../../tests/src/commands/browser/setupEditor.js";
import { withTiptapStyleCleanup } from "../../../tests/src/commands/browser/tiptapFixtureStyles.js";

import { BlockNoteView } from "./BlockNoteView.js";
import "./style.css";

// Preserve the real async React mount; forcing a synchronous commit would change
// the profiling contract. Check style ownership after the root has unmounted.
aroundEach(withTiptapStyleCleanup);

/**
 * Guards the render profile of `BlockNoteView` around portalling: routing the
 * floating UI elsewhere must not cost React commits or child renders. An
 * earlier portal implementation added one to three commits at mount depending
 * on the setup; that is the regression these pin.
 *
 * Every number is relative to the default setup measured in the same run, so
 * unrelated changes to how the editor itself renders don't break them. Both
 * StrictMode settings are covered: its double-invoked effects are where
 * append/remove and register/unregister pairs go wrong.
 */

type Setup =
  | "default"
  | "portalElements.default"
  | "portalElements.slashMenu"
  | "controller";

const PORTAL_SETUPS: Setup[] = [
  "portalElements.default",
  "portalElements.slashMenu",
  "controller",
];

let editor: BlockNoteEditor;
let root: Root | undefined;
let container: HTMLDivElement;
let target: HTMLDivElement;
let commits = 0;
let childRenders = 0;
let rerenderParent: () => void = () => {};

function onRender() {
  commits++;
}

function Child() {
  childRenders++;
  return null;
}

function Harness(props: { setup: Setup }) {
  const [, setTick] = useState(0);
  rerenderParent = () => setTick((tick) => tick + 1);

  const portalElements: PortalElementsMap | undefined =
    props.setup === "portalElements.default"
      ? { default: target }
      : props.setup === "portalElements.slashMenu"
        ? { slashMenu: target }
        : undefined;

  return (
    <Profiler id="view" onRender={onRender}>
      <BlockNoteView
        editor={editor}
        portalElements={portalElements}
        slashMenu={props.setup !== "controller"}
      >
        {props.setup === "controller" && (
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                getDefaultReactSlashMenuItems(editor),
                query,
              )
            }
            portalElement={target}
          />
        )}
        <Child />
      </BlockNoteView>
    </Profiler>
  );
}

/**
 * An effect can schedule a commit after `act` returns, notably on Linux
 * WebKit. Let the browser finish a frame (and run tasks queued before it)
 * before checking whether the profiler has stopped seeing commits.
 */
async function settle() {
  let last = commits;
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });
    });
    if (commits === last) {
      return;
    }
    last = commits;
  }
  throw new Error("commits did not settle");
}

async function mount(setupEditor: SetupEditor, setup: Setup, strict: boolean) {
  ({ editor } = await setupEditor({ mountType: false }));
  commits = 0;
  childRenders = 0;
  root = createRoot(container);
  const tree = <Harness setup={setup} />;
  await act(async () => {
    root!.render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  });
  await settle();
  if (!container.querySelector(".bn-editor")) {
    throw new Error("editor did not mount");
  }
  return { commits, childRenders };
}

async function unmount() {
  const view = root;
  root = undefined;
  await act(async () => {
    view?.unmount();
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  target = document.createElement("div");
  document.body.append(container, target);
});

afterEach(async () => {
  try {
    await unmount();
  } finally {
    container.remove();
    target.remove();
    vi.unstubAllGlobals();
  }
});

describe.each([{ strict: false }, { strict: true }])(
  "BlockNoteView render profile with portals (StrictMode: $strict)",
  ({ strict }) => {
    it("portal setups add no commits or child renders at mount", async ({
      setupEditor,
    }) => {
      const baseline = await mount(setupEditor, "default", strict);
      await unmount();

      for (const setup of PORTAL_SETUPS) {
        const measured = await mount(setupEditor, setup, strict);
        await unmount();
        expect({ setup, ...measured }).toEqual({ setup, ...baseline });
      }
    });

    it("an unrelated parent re-render costs the same with portals as without", async ({
      setupEditor,
    }) => {
      async function rerenderCost(setup: Setup) {
        await mount(setupEditor, setup, strict);
        const before = { commits, childRenders };
        await act(async () => {
          rerenderParent();
        });
        await settle();
        const cost = {
          commits: commits - before.commits,
          childRenders: childRenders - before.childRenders,
        };
        await unmount();
        return cost;
      }

      const baseline = await rerenderCost("default");
      for (const setup of PORTAL_SETUPS) {
        expect({ setup, ...(await rerenderCost(setup)) }).toEqual({
          setup,
          ...baseline,
        });
      }
    });
  },
);
