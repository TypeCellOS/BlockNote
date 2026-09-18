import { afterEach, describe, expect, test } from "vite-plus/test";
import { browserName, commands, userEvent } from "../../utils/context.js";
import type { ImeCompositionCommand } from "../../utils/imeComposition.js";

/**
 * Why the popover forms need no composition guard.
 *
 * The Enter handlers that `Form.Root`'s submit path replaced all guarded on
 * `isComposing` — necessary for a *keydown* handler, because the keydown for
 * an IME-consumed key still dispatches to JS. Native form submission is a
 * different category: the IME consumes the confirming Enter (it reaches the
 * page as keyCode 229, which the browser runs no default action for), so
 * implicit submission never fires mid-composition. This is why no plain
 * `<form onSubmit>` in the world carries composition handling.
 *
 * These tests pin the two halves of that contract on the real IME event
 * sequence. What they deliberately do *not* do is inject a bare Enter while
 * composition is held open: CDP can fabricate that state, and the browser
 * does submit on it, but no real IME delivers an unconsumed Enter
 * mid-composition — and guarding against the fabricated state would mean
 * betting that every IME fires `compositionend` before the submit it
 * triggers, or a Gboard-style single-press commit-and-submit gets swallowed.
 */

const browserCommands = commands as typeof commands & {
  imeComposition: ImeCompositionCommand;
};

// `Input.imeSetComposition` is CDP-only. Firefox and WebKit have no equivalent
// in their automation protocols, so real composition state can't be entered
// there at all — the behaviour is chromium-verified only.
const describeIme = browserName === "chromium" ? describe : describe.skip;

let form: HTMLFormElement | undefined;

afterEach(() => {
  form?.remove();
  form = undefined;
});

function buildForm() {
  form = document.createElement("form");
  const submits: string[] = [];
  const compositions: string[] = [];
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submits.push("submit");
  });

  const input = document.createElement("input");
  input.type = "text";
  input.name = "url";
  input.addEventListener("compositionstart", () =>
    compositions.push("compositionstart"),
  );
  input.addEventListener("compositionend", () =>
    compositions.push("compositionend"),
  );
  form.append(input);

  // What `Form.Root` renders, so that this mirrors a real popover form.
  const button = document.createElement("button");
  button.type = "submit";
  button.tabIndex = -1;
  form.append(button);

  document.body.append(form);
  return { input, submits, compositions };
}

describeIme("IME composition and form submission", () => {
  test("accepting a candidate does not submit the form", async () => {
    // The real accept path: the IME replaces the composition with the final
    // text (`insertText`), and the confirming key never reaches the page as
    // an actionable Enter — so nothing submits, natively.
    const { input, submits, compositions } = buildForm();
    input.focus();

    await browserCommands.imeComposition([
      { type: "setComposition", text: "にほん" },
      { type: "commit", text: "日本" },
    ]);

    expect(compositions).toContain("compositionstart");
    expect(input.value).toBe("日本");
    expect(
      submits,
      "accepting an IME candidate must not submit the popover",
    ).toEqual([]);
  });

  test("Enter after the composition ends does submit", async () => {
    // The other half of the contract: once composition is over, Enter has to
    // work normally, or CJK users could never submit at all.
    const { input, submits } = buildForm();
    input.focus();

    await browserCommands.imeComposition([
      { type: "setComposition", text: "にほん" },
      { type: "commit", text: "日本" },
    ]);
    await userEvent.keyboard("{Enter}");

    expect(submits).toEqual(["submit"]);
  });
});
