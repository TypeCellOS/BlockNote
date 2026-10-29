import { afterEach, describe, expect, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";

/**
 * The platform rules that `Form.Root` is built on.
 *
 * Since the toolbar popovers submit through the form's `submit` event rather
 * than a key handler (a mobile IME's action key fires the former and not the
 * latter), "does Enter reach `submit`?" became load-bearing. The answer is not
 * uniform: HTML only submits implicitly when the form has a submit button, or
 * exactly one field that blocks implicit submission
 * (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission).
 *
 * So these assert the rule per engine rather than trusting the spec — the
 * multi-field case is exactly the link toolbar's URL + title form, and the
 * hidden-button case is what `Form.Root` renders to make submission work
 * regardless of how many fields a caller puts in it.
 */

const forms: HTMLFormElement[] = [];

afterEach(() => {
  while (forms.length) {
    forms.pop()!.remove();
  }
});

type SubmitButton = "none" | "hidden" | "visually-hidden";

function buildForm(
  inputCount: number,
  submitButton: SubmitButton,
  tabIndex?: number,
) {
  const form = document.createElement("form");
  const submits: string[] = [];
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submits.push("submit");
  });

  const inputs: HTMLInputElement[] = [];
  for (let i = 0; i < inputCount; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = `field-${i}`;
    form.append(input);
    inputs.push(input);
  }

  if (submitButton !== "none") {
    const button = document.createElement("button");
    button.type = "submit";
    if (tabIndex !== undefined) {
      button.tabIndex = tabIndex;
    }
    if (submitButton === "hidden") {
      button.hidden = true;
    } else {
      button.style.cssText =
        "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    }
    form.append(button);
  }

  document.body.append(form);
  forms.push(form);
  return { inputs, submits };
}

async function pressEnterIn(input: HTMLInputElement) {
  input.focus();
  await userEvent.keyboard("{Enter}");
}

describe("Implicit form submission", () => {
  test("a single field submits without a submit button", async () => {
    const { inputs, submits } = buildForm(1, "none");

    await pressEnterIn(inputs[0]);

    expect(submits).toEqual(["submit"]);
  });

  test("several fields do NOT submit without a submit button", async () => {
    // The reason `Form.Root` cannot just be a bare `<form>`: the link
    // toolbar's edit form has two fields, so Enter would reach nothing.
    const { inputs, submits } = buildForm(2, "none");

    await pressEnterIn(inputs[0]);

    expect(submits).toEqual([]);
  });

  test("several fields submit once a hidden submit button is present", async () => {
    const { inputs, submits } = buildForm(2, "hidden");

    await pressEnterIn(inputs[0]);
    expect(submits).toEqual(["submit"]);

    // From the last field too, where a mobile IME offers its action key.
    await pressEnterIn(inputs[1]);
    expect(submits).toEqual(["submit", "submit"]);
  });

  test("several fields submit with a visually hidden submit button", async () => {
    // What `Form.Root` actually renders: clipped rather than `display: none`,
    // so assistive technology still sees a submit control. Keeping it out of
    // the layout must not cost the implicit submission that `hidden` provided.
    const { inputs, submits } = buildForm(2, "visually-hidden");

    await pressEnterIn(inputs[0]);

    expect(submits).toEqual(["submit"]);
  });

  test("a submit button outside the tab order still submits", async () => {
    // `Form.Root` sets `tabIndex={-1}` on it, so that a control nobody can see
    // never becomes a tab stop. Implicit submission looks for the form's
    // default button and must not care about that.
    const { inputs, submits } = buildForm(2, "visually-hidden", -1);

    await pressEnterIn(inputs[0]);

    expect(submits).toEqual(["submit"]);
  });

  test("a submit button does not make Enter submit twice", async () => {
    const { inputs, submits } = buildForm(1, "hidden");

    await pressEnterIn(inputs[0]);

    expect(submits).toEqual(["submit"]);
  });
});
