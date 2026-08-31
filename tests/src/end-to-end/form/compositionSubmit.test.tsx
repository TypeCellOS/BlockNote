import { afterEach, describe, expect, test } from "vite-plus/test";
import { browserName, commands, userEvent } from "../../utils/context.js";
import type { ImeCompositionCommand } from "../../utils/imeComposition.js";

/**
 * Every popover Enter handler used to guard on `isComposing`, so that Enter
 * pressed to accept an IME candidate committed the candidate instead of the
 * form. Those handlers are gone — submission now runs off the form's `submit`
 * event — which moves the question to the platform: can a composition-ending
 * Enter reach a form as an implicit submission?
 *
 * If it can, dropping the guards regressed CJK input everywhere, and the
 * guards have to come back at the form level. So it is asserted rather than
 * assumed.
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
  // Mirrors what `useFormSubmit` wires onto a real `Form.Root`.
  let composing = false;
  form.addEventListener("compositionstart", () => (composing = true));
  form.addEventListener("compositionend", () => (composing = false));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing) {
      return;
    }
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

describeIme("Enter during an IME composition", () => {
  test("accepting a candidate does not submit the form", async () => {
    const { input, submits, compositions } = buildForm();
    input.focus();

    // Accepting a candidate the way an IME does: the final text replaces the
    // composing text, and the confirming key never reaches the page.
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

  test("Enter arriving mid-composition does not submit the form", async () => {
    // The case that makes the guard necessary rather than defensive: the
    // browser delivers this Enter as `keydown` with `isComposing: true` and
    // performs implicit submission for it regardless, so without the guard a
    // CJK user accepting a candidate submits the popover mid-word.
    const { input, submits, compositions } = buildForm();
    const composingOnKeyDown: boolean[] = [];
    input.addEventListener("keydown", (event) =>
      composingOnKeyDown.push(event.isComposing),
    );
    input.focus();

    await browserCommands.imeComposition([
      { type: "setComposition", text: "にほん" },
    ]);
    await userEvent.keyboard("{Enter}");

    // Pin the precondition too: if a future engine stopped delivering this
    // Enter to the page, the guard would be untested rather than unnecessary.
    expect(
      composingOnKeyDown,
      "Enter must reach the page mid-composition",
    ).toEqual([true]);
    expect(compositions).not.toContain("compositionend");
    expect(
      submits,
      "Enter must not submit while a composition is in progress",
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
