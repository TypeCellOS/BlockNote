import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
} from "@blocknote/react";
import { describe, expect, vi } from "vite-plus/test";
// The shadcn example's `main.tsx` (not loaded in tests) imports this to
// bootstrap Tailwind v4 + the ShadCN theme variables.
import shadcnStyles from "../../../../examples/01-basic/09-shadcn/tailwind.css?inline";
import { MOD } from "../../commands/browser/keyboard.js";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";

useBrowserSuiteStyles(shadcnStyles);

// The browser setup installs this fixture but sits outside tests/tsconfig.json.
// The link forms open from toolbars whose menus and popovers portal next to
// the toolbar rather than inside it. These tests click with `userEvent.click`
// on purpose: it presses and releases within the same tick, which is how the
// mantine toolbar's former focus trap used to steal the form's autofocus back
// into the toolbar before a human could type.
//
// They run per skin: each skin's popover decides on its own how the URL field
// takes focus, and the per-skin screenshot tests cannot tell "link created"
// from "nothing happened" within the 2% screenshot tolerance.

const LINK_SELECTOR = 'a[data-inline-content-type="link"]';
const FORM_SELECTOR = ".bn-form-popover";
const URL_INPUT_SELECTOR = `${FORM_SELECTOR} input[name=url]`;

const SKINS = ["mantine", "ariakit", "shadcn"] as const;
const SELECTION_MATRIX_UI = {
  linkToolbar: false,
  slashMenu: false,
  emojiPicker: false,
  sideMenu: false,
  filePanel: false,
  tableHandles: false,
};

const ORIGINAL_URL = "https://example.com";
const CHANGED_URL = "https://changed.example";
const TEXT = "before Example after";
const SELECTIONS = [
  { name: "middle of link", from: 9, to: 12 },
  { name: "start of link", from: 7, to: 10 },
  { name: "last linked character", from: 13, to: 14 },
  { name: "plain text at link end", from: 14, to: 17 },
  { name: "link into plain text", from: 12, to: 16 },
  { name: "plain text into link", from: 4, to: 10 },
  { name: "whole link", from: 7, to: 14 },
] as const;

const LINKED_CONTENT: PartialBlock[] = [
  {
    type: "paragraph",
    content: [
      { type: "text", text: "before ", styles: {} },
      {
        type: "link",
        href: ORIGINAL_URL,
        content: [
          { type: "text", text: "Ex", styles: { italic: true } },
          { type: "text", text: "amp", styles: { bold: true } },
          { type: "text", text: "le", styles: { underline: true } },
        ],
      },
      { type: "text", text: " after", styles: {} },
    ],
  },
];

// Compare per character so splitting/merging link nodes cannot hide lost text,
// changed inline marks, or URL changes outside the selected range.
function inlineCharacters(editor: BlockNoteEditor) {
  const paragraph = editor.document[0];
  if (paragraph.type !== "paragraph") {
    throw new Error("Missing fixture paragraph");
  }
  return paragraph.content.flatMap((inline) => {
    const href = inline.type === "link" ? inline.href : undefined;
    const runs = inline.type === "link" ? inline.content : [inline];
    return runs.flatMap((run) =>
      Array.from(run.text, (text) => ({ text, href, styles: run.styles })),
    );
  });
}

function textPosition(element: HTMLElement, offset: number): [Text, number] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (
    let text = walker.nextNode();
    text instanceof Text;
    text = walker.nextNode()
  ) {
    if (offset <= text.length) {
      return [text, offset];
    }
    offset -= text.length;
  }
  throw new Error("Selection offset is outside the fixture text");
}

async function clickAndGetFocusedUrlInput(button: HTMLElement) {
  await userEvent.click(button);
  const input = page.getByRole("dialog").getByRole("textbox").first();
  // Mantine mounts the form on an animation frame. Wait for the form to
  // appear, then assert focus immediately so a focus trap stealing it fails.
  await expect.element(input).toBeVisible();
  const element = input.element();
  expect(document.activeElement).toBe(element);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Missing URL input");
  }
  return element;
}

function LinkOnlyFormattingToolbar() {
  return (
    <FormattingToolbar>
      <CreateLinkButton />
    </FormattingToolbar>
  );
}

function waitForUrlInput() {
  return vi.waitFor(
    () => {
      const input = document.querySelector(URL_INPUT_SELECTOR);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error("Missing URL input");
      }
      return input;
    },
    // Check frame-driven mounts without rounding up to the default 50 ms poll.
    { interval: 16, timeout: 5000 },
  );
}

async function waitForFormToCloseAndReturnFocus(editor: BlockNoteEditor) {
  await expect
    .poll(
      () => ({
        formOpen: document.querySelector(FORM_SELECTOR) !== null,
        editorFocused: editor.domElement?.contains(document.activeElement),
      }),
      { interval: 16 },
    )
    .toEqual({ formOpen: false, editorFocused: true });
}

function linkHref() {
  return document.querySelector<HTMLAnchorElement>(LINK_SELECTOR)?.href;
}

for (const skin of SKINS) {
  describe(`Formatting toolbar links preserve the selection (${skin})`, () => {
    for (const [index, selection] of SELECTIONS.entries()) {
      for (const reverse of [false, true]) {
        for (const url of [ORIGINAL_URL, CHANGED_URL, ""]) {
          const trigger = (["button", "Control", "Meta"] as const)[
            (index + Number(reverse)) % 3
          ];
          it(`${selection.name}, ${reverse ? "backward" : "forward"}, ${url || "empty URL"}, ${trigger}`, async ({
            setupEditor,
          }) => {
            // Seed the document independently of the initial-link autofocus
            // tests below; submission itself still goes through the real UI.
            const { editor } = await setupEditor({
              skin,
              initialContent: LINKED_CONTENT,
              props: { ...SELECTION_MATRIX_UI, formattingToolbar: false },
              // Use each skin's real toolbar and link control without mounting
              // unrelated buttons. The focus cases below use the stock toolbar.
              children: (
                <FormattingToolbarController
                  formattingToolbar={LinkOnlyFormattingToolbar}
                />
              ),
            });
            const before = inlineCharacters(editor);
            const documentBefore = editor.document;
            const content =
              editor.domElement?.querySelector<HTMLElement>(
                ".bn-inline-content",
              );
            if (!content) {
              throw new Error("Missing fixture paragraph");
            }
            const from = textPosition(content, selection.from);
            const to = textPosition(content, selection.to);
            editor.focus();
            // Let the editor finish restoring its editable caret before
            // arranging the native forward/backward selection.
            await window.__blockNoteWaitForEditorFocus();
            document
              .getSelection()
              ?.setBaseAndExtent(
                ...(reverse ? to : from),
                ...(reverse ? from : to),
              );
            await expect
              .poll(() => editor.getSelectedText())
              .toBe(TEXT.slice(selection.from, selection.to));
            if (trigger === "button") {
              await userEvent.click(
                page.getByRole("button", {
                  name: editor.dictionary.formatting_toolbar.link.tooltip,
                  exact: true,
                }),
              );
            } else {
              // The shortcut listener belongs to the mounted CreateLinkButton.
              await waitForSelector(LINK_BUTTON_SELECTOR);
              await userEvent.keyboard(`{${trigger}>}k{/${trigger}}`);
            }
            const input = await waitForUrlInput();
            expect(input.value).toBe(
              selection.from >= 7 && selection.from < 14 ? ORIGINAL_URL : "",
            );
            // An already-focused field with the desired value only needs Enter.
            if (input.value !== url || document.activeElement !== input) {
              await userEvent.fill(input, url);
            }
            await userEvent.keyboard("{Enter}");
            await waitForFormToCloseAndReturnFocus(editor);
            const expected = before.map((char, pos) => ({
              ...char,
              href:
                url && pos >= selection.from && pos < selection.to
                  ? url
                  : char.href,
            }));
            await expect.poll(() => inlineCharacters(editor)).toEqual(expected);
            if (JSON.stringify(expected) !== JSON.stringify(before)) {
              await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
              await expect.poll(() => editor.document).toEqual(documentBefore);
            }
          });
        }
      }
    }
  });

  describe(`Link forms keep focus after an instantaneous click (${skin})`, () => {
    it("Create link: typing right after the click fills the URL field", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor({
        skin,
        initialContent: [{ type: "paragraph", content: "Paragraph" }],
      });
      const content = await waitForSelector(
        `${EDITOR_SELECTOR} .bn-inline-content`,
      );
      editor.focus();
      document.getSelection()?.selectAllChildren(content);
      await expect.poll(() => editor.getSelectedText()).toBe("Paragraph");

      await clickAndGetFocusedUrlInput(
        await waitForSelector(LINK_BUTTON_SELECTOR),
      );
      await userEvent.keyboard(`${ORIGINAL_URL}{Enter}`);
      await waitForFormToCloseAndReturnFocus(editor);
      await expect.poll(linkHref).toBe(`${ORIGINAL_URL}/`);
    });

    it("Link toolbar: Edit focuses the URL field and Enter applies the change", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor({
        skin,
        initialContent: [
          {
            type: "paragraph",
            content: [
              { type: "link", href: ORIGINAL_URL, content: "Paragraph" },
            ],
          },
        ],
      });
      editor.focus();
      // Place the cursor inside the link to open its toolbar without hovering.
      editor.setTextCursorPosition(editor.document[0], "end");
      await userEvent.keyboard("{ArrowLeft}");

      const input = await clickAndGetFocusedUrlInput(
        await waitForSelector(".bn-link-toolbar button"),
      );
      // Focus was already asserted; select the old value without refocusing.
      input.setSelectionRange(0, input.value.length);
      await userEvent.keyboard(`${CHANGED_URL}{Enter}`);
      await expect.poll(linkHref).toBe(`${CHANGED_URL}/`);
    });
  });
}
