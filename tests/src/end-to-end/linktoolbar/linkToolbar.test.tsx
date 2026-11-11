import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView as AriakitView } from "@blocknote/ariakit";
import { BlockNoteView as MantineView } from "@blocknote/mantine";
import { BlockNoteView as ShadcnView } from "@blocknote/shadcn";
import AriakitApp from "@examples/01-basic/08-ariakit/src/App";
// The shadcn example's `main.tsx` (not loaded in tests) imports this to
// bootstrap Tailwind v4 + the ShadCN theme variables.
import "@examples/01-basic/09-shadcn/tailwind.css";
import ShadcnApp from "@examples/01-basic/09-shadcn/src/App";
import MantineApp from "@examples/01-basic/testing/src/App";
import { TextSelection } from "@tiptap/pm/state";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

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

const SKINS = [
  { name: "mantine", App: MantineApp, View: MantineView },
  { name: "ariakit", App: AriakitApp, View: AriakitView },
  { name: "shadcn", App: ShadcnApp, View: ShadcnView },
] as const;

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

function createLinkedEditor() {
  return BlockNoteEditor.create({
    initialContent: [
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
    ],
  });
}

// Compare per character so splitting/merging link nodes cannot hide lost text,
// changed inline marks, or URL changes outside the selected range.
function inlineCharacters(editor: ReturnType<typeof createLinkedEditor>) {
  const characters: { text: string; href: unknown; marks: string[] }[] = [];
  editor.prosemirrorState.doc.descendants((node) => {
    if (!node.isText) {
      return;
    }
    for (const text of node.text || "") {
      characters.push({
        text,
        href: node.marks.find((mark) => mark.type.name === "link")?.attrs.href,
        marks: node.marks
          .filter((mark) => mark.type.name !== "link")
          .map((mark) => JSON.stringify(mark.toJSON()))
          .sort(),
      });
    }
  });
  return characters;
}

async function createLink(url: string) {
  await focusOnEditor();
  await userEvent.keyboard("Paragraph");
  await userEvent.keyboard("{Shift>}{Home}{/Shift}");
  await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
  await userEvent.keyboard(url);
  await userEvent.keyboard("{Enter}");
  await waitForSelector(LINK_SELECTOR);
  await expect
    .poll(() => document.querySelector(".bn-form-popover"))
    .toBeNull();
  await expect
    .poll(() =>
      document.querySelector(EDITOR_SELECTOR)?.contains(document.activeElement),
    )
    .toBe(true);
  await sleep(300);
}

for (const skin of SKINS) {
  describe(`Formatting toolbar links preserve the selection (${skin.name})`, () => {
    for (const [index, selection] of SELECTIONS.entries()) {
      for (const reverse of [false, true]) {
        for (const url of [ORIGINAL_URL, CHANGED_URL, ""]) {
          const trigger = (["button", "Control", "Meta"] as const)[
            (index + Number(reverse)) % 3
          ];
          test(`${selection.name}, ${reverse ? "backward" : "forward"}, ${url || "empty URL"}, ${trigger}`, async () => {
            // Seed the document independently of the initial-link autofocus
            // tests below; submission itself still goes through the real UI.
            const editor = createLinkedEditor();
            await render(<skin.View editor={editor} />);
            await waitForSelector(EDITOR_SELECTOR);
            const before = inlineCharacters(editor);
            const documentBefore = editor.prosemirrorState.doc.toJSON();
            let start: number | undefined;
            editor.prosemirrorState.doc.descendants((node, pos) => {
              if (start === undefined && node.isText) {
                start = pos;
              }
            });
            if (start === undefined) {
              throw new Error("Missing fixture text");
            }
            const from = start + selection.from;
            const to = start + selection.to;
            editor.transact((tr) =>
              tr.setSelection(
                TextSelection.create(
                  tr.doc,
                  reverse ? to : from,
                  reverse ? from : to,
                ),
              ),
            );
            editor.focus();
            await expect
              .poll(() => window.getSelection()?.toString())
              .toBe(TEXT.slice(selection.from, selection.to));
            const button = await waitForSelector(LINK_BUTTON_SELECTOR);
            if (trigger === "button") {
              await userEvent.click(button);
            } else {
              await userEvent.keyboard(`{${trigger}>}k{/${trigger}}`);
            }
            const input = await waitForSelector(
              ".bn-form-popover input[name=url]",
            );
            if (!(input instanceof HTMLInputElement)) {
              throw new Error("Missing URL input");
            }
            expect(input.value).toBe(
              selection.from >= 7 && selection.from < 14 ? ORIGINAL_URL : "",
            );
            await userEvent.fill(input, url);
            await userEvent.keyboard("{Enter}");
            await expect
              .poll(() => document.querySelector(".bn-form-popover"))
              .toBeNull();
            await expect
              .poll(() =>
                document
                  .querySelector(EDITOR_SELECTOR)
                  ?.contains(document.activeElement),
              )
              .toBe(true);
            const expected = before.map((char, pos) => ({
              ...char,
              href:
                url && pos >= selection.from && pos < selection.to
                  ? url
                  : char.href,
            }));
            await expect.poll(() => inlineCharacters(editor)).toEqual(expected);
            if (JSON.stringify(expected) !== JSON.stringify(before)) {
              await userEvent.keyboard("{Control>}z{/Control}");
              await expect
                .poll(() => editor.prosemirrorState.doc.toJSON())
                .toEqual(documentBefore);
            }
          });
        }
      }
    }
  });

  describe(`Link forms keep focus after an instantaneous click (${skin.name})`, () => {
    beforeEach(async () => {
      await render(<skin.App />);
      await waitForSelector(EDITOR_SELECTOR);
    });

    test("Create link: typing right after the click fills the URL field", async () => {
      await createLink("https://example.com");

      expect(
        document.querySelector<HTMLAnchorElement>(LINK_SELECTOR)?.href,
      ).toBe("https://example.com/");
    });

    test("Link toolbar: Edit focuses the URL field and Enter applies the change", async () => {
      await createLink("https://example.com");

      await userEvent.keyboard("{End}");
      await userEvent.keyboard("{ArrowLeft}");
      await moveMouseOverElement(LINK_SELECTOR);
      const linkToolbar = await waitForSelector(".bn-link-toolbar");

      await userEvent.click(linkToolbar.querySelector("button")!);
      await sleep(300);

      const input = await waitForSelector(".bn-form-popover input");
      expect(document.activeElement).toBe(input);

      await userEvent.keyboard("{Control>}a{/Control}{Meta>}a{/Meta}");
      await userEvent.keyboard("https://changed.example");
      await userEvent.keyboard("{Enter}");
      await sleep(300);

      expect(
        document.querySelector<HTMLAnchorElement>(LINK_SELECTOR)?.href,
      ).toBe("https://changed.example/");
    });
  });
}
