import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { expectNoNewViolations } from "../../utils/axe.js";
import { userEvent } from "../../utils/context.js";
import {
  COLORS_BUTTON_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// One entry per UI surface. Scanning is cheap; opening the surface is the
// cost, so each entry does the least work that puts the surface on screen —
// and adding a surface is one table row, not a new test.
//
// The mobile chrome (pinned toolbar, its popovers) has its own table in
// end-to-end/mobile/accessibility.test.tsx: those surfaces only exist under
// touch emulation with a keyboard-sized viewport.
const SURFACES: { name: string; open: () => Promise<void> }[] = [
  {
    name: "editor",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
    },
  },
  {
    name: "formatting toolbar",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");
      await sleep(400);
    },
  },
  {
    name: "link popover",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");
      await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
      await sleep(400);
    },
  },
  {
    name: "color picker",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");
      await userEvent.click(await waitForSelector(COLORS_BUTTON_SELECTOR));
      await sleep(400);
    },
  },
  {
    name: "slash menu",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("/");
      await sleep(400);
    },
  },
  {
    name: "emoji picker",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard(":");
      await userEvent.keyboard("sm");
      await sleep(600);
    },
  },
  {
    name: "side menu",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
      await moveMouseOverElement(PARAGRAPH_SELECTOR);
      await sleep(400);
    },
  },
  {
    name: "drag handle menu",
    open: async () => {
      await focusOnEditor();
      await userEvent.keyboard("Paragraph");
      await moveMouseOverElement(PARAGRAPH_SELECTOR);
      await sleep(300);
      await waitForSelector(DRAG_HANDLE_SELECTOR);
      await moveMouseOverElement(DRAG_HANDLE_SELECTOR);
      await mouseSequence([{ type: "down" }, { type: "up" }]);
      await sleep(400);
    },
  },
  {
    name: "file panel",
    open: async () => {
      await focusOnEditor();
      await executeSlashCommand("image");
      await sleep(400);
    },
  },
];

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Accessibility (axe)", () => {
  for (const surface of SURFACES) {
    test(`no new violations: ${surface.name}`, async () => {
      await surface.open();
      await expectNoNewViolations(surface.name);
    });
  }
});
