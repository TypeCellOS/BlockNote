import App from "@examples/01-basic/testing/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";

import {
  browserName,
  commands,
  MOD,
  page,
  userEvent,
} from "../../utils/context.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";
import type { ImeCompositionCommand } from "../../utils/imeComposition.js";

const browserCommands = commands as typeof commands & {
  imeComposition: ImeCompositionCommand;
};

function editorText(): string {
  return document.querySelector(EDITOR_SELECTOR)!.textContent!;
}

function blockCount(): number {
  return document.querySelectorAll(BLOCK_CONTAINER_SELECTOR).length;
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

// Emulated IME composition through Chromium's real pipeline (CDP
// `Input.imeSetComposition`/`insertText` — see utils/imeComposition.ts): the
// browser emits the genuine compositionstart/update/end + `beforeinput:
// insertCompositionText` sequence with actual DOM mutation, which is what
// mobile IMEs (Gboard, Samsung Keyboard) produce and what prosemirror-view's
// composition handling reacts to. Runs on the android instance so
// prosemirror is on its Android code paths; CDP is chromium-only, so the
// ios (webkit) instance skips.
describe.skipIf(browserName !== "chromium")("IME composition", () => {
  test("composed word commits into the document once", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Hello ");

    await browserCommands.imeComposition([
      { type: "setComposition", text: "w" },
      { type: "setComposition", text: "wo" },
      { type: "setComposition", text: "wor" },
      { type: "commit", text: "world" },
    ]);

    await vi.waitFor(() => {
      if (editorText() !== "Hello world") {
        throw new Error(`unexpected text: ${JSON.stringify(editorText())}`);
      }
    });
    expect(blockCount()).toBe(1);
  });

  test("commit with different text (autocorrect) replaces the composition", async () => {
    await focusOnEditor();
    await userEvent.keyboard("I saw ");

    // Gboard-style: the user typed "teh", autocorrect commits "the ".
    await browserCommands.imeComposition([
      { type: "setComposition", text: "t" },
      { type: "setComposition", text: "te" },
      { type: "setComposition", text: "teh" },
      { type: "commit", text: "the " },
    ]);

    await vi.waitFor(() => {
      const text = editorText();
      if (text !== "I saw the ") {
        throw new Error(`unexpected text: ${JSON.stringify(text)}`);
      }
    });
  });

  test("Enter after a committed composition splits cleanly", async () => {
    await focusOnEditor();
    await browserCommands.imeComposition([
      { type: "setComposition", text: "Firs" },
      { type: "commit", text: "First" },
    ]);
    await vi.waitFor(() => {
      if (!editorText().includes("First")) {
        throw new Error("composition did not commit");
      }
    });

    const blocksBefore = blockCount();
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => {
      if (blockCount() !== blocksBefore + 1) {
        throw new Error("Enter after composition did not split");
      }
    });
    await userEvent.keyboard("Second");
    await vi.waitFor(() => {
      if (!editorText().includes("Second")) {
        throw new Error("typing after the split did not land");
      }
    });
    // The classic corruption signatures: text duplicated or a stray space.
    expect(editorText()).toBe("FirstSecond");
  });

  // Note on "Enter mid-composition": interleaving a key event with an
  // uncommitted CDP composition makes Chromium abort the composition — a
  // sequence no real IME produces (they commit the composition first, then
  // deliver Enter; that ordering is covered by the test above). What real
  // IMEs *can* do is cancel:
  test("cancelled composition leaves no residue", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Before ");
    await browserCommands.imeComposition([
      { type: "setComposition", text: "hal" },
      { type: "setComposition", text: "half" },
      { type: "commit", text: "" },
    ]);

    await vi.waitFor(() => {
      const text = editorText();
      if (text !== "Before ") {
        throw new Error(
          `cancelled composition left residue: ${JSON.stringify(text)}`,
        );
      }
    });
    expect(blockCount()).toBe(1);

    // The editor must still be fully usable afterwards.
    await userEvent.keyboard("after");
    await vi.waitFor(() => {
      if (editorText() !== "Before after") {
        throw new Error(
          `typing after cancel broke: ${JSON.stringify(editorText())}`,
        );
      }
    });
  });

  test("composition in an empty block (placeholder decoration present)", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Above");
    await userEvent.keyboard("{Enter}");

    // The caret sits in an empty block whose placeholder decoration goes
    // away as the composition's first update lands — decoration churn
    // mid-composition is a classic composition breaker.
    await browserCommands.imeComposition([
      { type: "setComposition", text: "t" },
      { type: "setComposition", text: "ty" },
      { type: "commit", text: "typed" },
    ]);

    await vi.waitFor(() => {
      if (editorText() !== "Abovetyped") {
        throw new Error(`unexpected text: ${JSON.stringify(editorText())}`);
      }
    });
    expect(blockCount()).toBe(2);
  });

  test("composition under an active bold mark stays bold", async () => {
    await focusOnEditor();
    await userEvent.keyboard("plain ");
    await userEvent.keyboard(`{${MOD}>}b{/${MOD}}`);

    await browserCommands.imeComposition([
      { type: "setComposition", text: "bo" },
      { type: "commit", text: "bold" },
    ]);

    await vi.waitFor(() => {
      const strong = document.querySelector(`${EDITOR_SELECTOR} strong`);
      if (strong?.textContent !== "bold") {
        throw new Error(
          `bold mark did not survive composition: ${JSON.stringify(
            strong?.textContent ?? null,
          )}`,
        );
      }
    });
    expect(editorText()).toBe("plain bold");
  });

  test("retroactive replacement of committed text (autocorrect on space)", async () => {
    await focusOnEditor();
    await userEvent.keyboard("teh");

    // Gboard's correct-previous-word-on-space: a composition that replaces
    // the already-committed range instead of inserting at the caret.
    await browserCommands.imeComposition([
      {
        type: "setComposition",
        text: "the",
        replacementStart: 0,
        replacementEnd: 3,
      },
      { type: "commit", text: "the " },
    ]);

    await vi.waitFor(() => {
      const text = editorText();
      if (text !== "the ") {
        throw new Error(`unexpected text: ${JSON.stringify(text)}`);
      }
    });
    expect(blockCount()).toBe(1);
  });
});
