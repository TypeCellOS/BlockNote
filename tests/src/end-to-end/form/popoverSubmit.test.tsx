import type { PartialBlock } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { browserName, commands, page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  focusOnEditor,
  waitForSelector,
} from "../../utils/editor.js";

/**
 * The toolbar popovers commit through their form's `submit` event, because a
 * mobile IME's action key fires that and no key event at all.
 *
 * These drive Enter rather than calling the handlers, so they cover the whole
 * path a browser takes to reach `onSubmit` — including whether the form is
 * eligible for implicit submission at all, which depends on how many fields
 * the popover happens to render (see ./implicitSubmit.test.tsx).
 */

async function mountTestingApp() {
  const [{ default: TestingApp }, { render }] = await Promise.all([
    import("@examples/01-basic/testing/src/App"),
    import("vitest-browser-react"),
  ]);
  await render(<TestingApp />);
  await waitForSelector(EDITOR_SELECTOR);
}

const linkedDocument: PartialBlock[] = [
  {
    type: "paragraph",
    content: [
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "link me", styles: {} }],
      },
    ],
  },
];

async function openLinkEditForm() {
  await userEvent.hover(await waitForSelector('a[href="https://example.com"]'));
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  return waitForSelector('input[name="url"]');
}

async function openImageEmbedForm(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    initialContent: [{ id: "image", type: "image" }, { type: "paragraph" }],
    // Match the testing app's upload callback so Upload is the default tab.
    async uploadFile(file) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    },
  });
  editor.setTextCursorPosition("image");
  editor.focus();
  await window.__blockNoteWaitForEditorFocus();
  await userEvent.click(await waitForSelector(".bn-add-file-button"));
  await userEvent.click(await waitForSelector(`[data-test="embed-tab"]`));
  return waitForSelector(`[data-test="embed-input"]`);
}

describe("Submitting a toolbar popover with Enter", () => {
  it("the link edit form commits, though it has two fields", async ({
    setupEditor,
  }) => {
    // The regression this guards: HTML only submits a form implicitly when it
    // has a submit button *or* exactly one field. The create form has one
    // field (url) and submits on its own; this edit form adds the title
    // field, so without the submit button `Form.Root` renders, Enter reaches
    // nothing and the edit is silently dropped.
    await setupEditor({ initialContent: linkedDocument });
    const urlInput = await openLinkEditForm();
    // Both fields are present — that is what makes this case different.
    expect(document.querySelector('input[name="title"]')).not.toBeNull();

    await userEvent.tripleClick(urlInput);
    await userEvent.keyboard("edited.com{Enter}");

    await waitForSelector('a[href="https://edited.com"]');
  });

  it("the submit control stays available to assistive technology", async ({
    setupEditor,
  }) => {
    // `display: none` would take the button out of the accessibility tree
    // entirely, leaving Enter as the only way to commit — nothing for a
    // screen reader or voice control to target. It has to be clipped instead,
    // and carry a real accessible name.
    await setupEditor({ initialContent: linkedDocument });
    const input = await openLinkEditForm();

    const form = input.closest("form")!;
    const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (!submit) {
      throw new Error("The form must expose a submit control");
    }
    await expect
      .poll(() =>
        page
          .elementLocator(form)
          .getByRole("button", { name: "OK", exact: true })
          .query(),
      )
      .toBe(submit);
    // Out of the tab order, so sighted keyboard users never land on a control
    // they can't see.
    expect(submit.tabIndex).toBe(-1);
  });

  it("the embed tab's visible button is the form's one submit control", async ({
    setupEditor,
  }) => {
    // The embed button lives inside the `<form>` as its `submitButton`, so
    // clicking it, pressing Enter, and a mobile IME's action key all commit
    // through the same `submit` event — and assistive technology sees exactly
    // one labelled action for the one thing this panel does. Exactly one:
    // a second (hidden) submit control would announce two.
    const input = await openImageEmbedForm(setupEditor);

    const form = input.closest("form")!;
    const submit = form.querySelector("button[type=submit]");
    if (!submit) {
      throw new Error("The embed form must expose a submit control");
    }
    const formLocator = page.elementLocator(form);
    await expect
      .poll(() =>
        formLocator
          .getByRole("button", { name: "Embed image", exact: true })
          .query(),
      )
      .toBe(submit);
    expect(formLocator.getByRole("button").elements()).toEqual([submit]);
    expect(form.querySelectorAll("button[type=submit]")).toHaveLength(1);
    await expectElement(submit).toBeVisible();
  });

  it("the embed tab's URL field commits", async ({ setupEditor }) => {
    // The embed tab used to be the one input with an Enter handler and no
    // form at all, so its action key did nothing on mobile.
    const input = await openImageEmbedForm(setupEditor);
    await userEvent.click(input);

    const url = "https://placehold.co/800x540.png";
    await userEvent.keyboard(`${url}{Enter}`);

    await waitForSelector(`img[src="${url}"]`);
  });

  // `Input.imeSetComposition` is CDP-only, so the real composition state can
  // only be entered in chromium.
  it.skipIf(browserName !== "chromium")(
    "accepting an IME candidate does not commit the popover",
    async () => {
      // The real accept path: the IME consumes the confirming key and
      // replaces the composition with the final text, so no actionable Enter
      // reaches the page and nothing submits — natively, with no composition
      // guard in `Form.Root` (see ./compositionSubmit.test.tsx for why none
      // is needed).
      await mountTestingApp();
      await focusOnEditor();
      await userEvent.keyboard("link me");
      await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
      await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
      const input = (await waitForSelector(
        'input[name="url"]',
      )) as HTMLInputElement;
      await userEvent.click(input);

      await commands.imeComposition([
        { type: "setComposition", text: "example.co" },
        { type: "commit", text: "example.com" },
      ]);

      expect(input.value).toBe("example.com");
      expect(
        document.querySelector(`${EDITOR_SELECTOR} a`),
        "accepting a candidate must not commit the link",
      ).toBeNull();

      // Enter after the composition commits it as usual.
      await userEvent.keyboard("{Enter}");
      await waitForSelector(`${EDITOR_SELECTOR} a`);
    },
  );
});
