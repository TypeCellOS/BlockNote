import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  type PortalElementsMap,
  SuggestionMenuController,
} from "@blocknote/react";
import { act, Profiler, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";

import { BlockNoteView } from "./BlockNoteView.js";
import "./style.css";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

async function mount(setup: Setup, strict: boolean) {
  editor = BlockNoteEditor.create();
  commits = 0;
  childRenders = 0;
  root = createRoot(container);
  const tree = <Harness setup={setup} />;
  await act(async () => {
    root!.render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  });
  if (!container.querySelector(".bn-editor")) {
    throw new Error("editor did not mount");
  }
  return { commits, childRenders };
}

async function unmount() {
  await act(async () => {
    root?.unmount();
  });
  root = undefined;
  editor._tiptapEditor.destroy();
}

beforeEach(() => {
  container = document.createElement("div");
  target = document.createElement("div");
  document.body.append(container, target);
});

afterEach(async () => {
  if (root) {
    await unmount();
  }
  container.remove();
  target.remove();
});

describe.each([{ strict: false }, { strict: true }])(
  "BlockNoteView render profile with portals (StrictMode: $strict)",
  ({ strict }) => {
    test("portal setups add no commits or child renders at mount", async () => {
      const baseline = await mount("default", strict);
      await unmount();

      for (const setup of PORTAL_SETUPS) {
        const measured = await mount(setup, strict);
        await unmount();
        expect({ setup, ...measured }).toEqual({ setup, ...baseline });
      }
    });

    test("an unrelated parent re-render costs the same with portals as without", async () => {
      async function rerenderCost(setup: Setup) {
        await mount(setup, strict);
        const before = { commits, childRenders };
        await act(async () => {
          rerenderParent();
        });
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
