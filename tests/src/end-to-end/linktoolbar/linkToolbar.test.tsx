import AriakitApp from "@examples/01-basic/08-ariakit/src/App";
// The shadcn example's `main.tsx` (not loaded in tests) imports this to
// bootstrap Tailwind v4 + the ShadCN theme variables.
import "@examples/01-basic/09-shadcn/tailwind.css";
import ShadcnApp from "@examples/01-basic/09-shadcn/src/App";
import MantineApp from "@examples/01-basic/testing/src/App";
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
  { name: "mantine", App: MantineApp },
  { name: "ariakit", App: AriakitApp },
  { name: "shadcn", App: ShadcnApp },
] as const;

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

    for (const url of ["https://example.com", "https://changed.example"]) {
      test(`preserves all text when linking a partial selection (${url})`, async () => {
        await createLink("https://example.com");
        await userEvent.keyboard(
          "{Home}{ArrowRight}{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
        );
        await expect.poll(() => window.getSelection()?.toString()).toBe("rag");
        await sleep(300);
        await userEvent.keyboard("{Control>}k{/Control}");
        const input = await waitForSelector(".bn-form-popover input[name=url]");
        expect(input).toBeInstanceOf(HTMLInputElement);
        if (!(input instanceof HTMLInputElement)) {
          throw new Error("The URL field is not an input element");
        }
        expect(input.value).toBe("https://example.com");
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.keyboard(url);
        await userEvent.keyboard("{Enter}");
        await expect
          .poll(() => document.querySelector(".bn-form-popover"))
          .toBeNull();
        await expect
          .poll(() => document.querySelector(EDITOR_SELECTOR)?.textContent)
          .toBe("Paragraph");
        await expect
          .poll(() =>
            Array.from(
              document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR),
            ).map((link) => ({
              text: link.textContent,
              href: link.href,
            })),
          )
          .toEqual(
            url === "https://example.com"
              ? [{ text: "Paragraph", href: "https://example.com/" }]
              : [
                  { text: "Pa", href: "https://example.com/" },
                  { text: "rag", href: "https://changed.example/" },
                  { text: "raph", href: "https://example.com/" },
                ],
          );
      });
    }

    for (const existingLink of [false, true]) {
      test(`an empty URL leaves the selection unchanged (existing link: ${existingLink})`, async () => {
        if (existingLink) {
          await createLink("https://example.com");
          await userEvent.keyboard(
            "{Home}{ArrowRight}{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
          );
        } else {
          await focusOnEditor();
          await userEvent.keyboard("Paragraph");
          await userEvent.keyboard("{Shift>}{Home}{/Shift}");
        }
        await expect
          .poll(() => window.getSelection()?.toString())
          .toBe(existingLink ? "rag" : "Paragraph");
        await sleep(300);
        await userEvent.keyboard("{Control>}k{/Control}");
        await waitForSelector(".bn-form-popover input[name=url]");
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}{Enter}");
        await expect
          .poll(() => document.querySelector(".bn-form-popover"))
          .toBeNull();
        await expect
          .poll(() => document.querySelector(EDITOR_SELECTOR)?.textContent)
          .toBe("Paragraph");
        await expect
          .poll(() =>
            Array.from(
              document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR),
            ).map((link) => ({ text: link.textContent, href: link.href })),
          )
          .toEqual(
            existingLink
              ? [{ text: "Paragraph", href: "https://example.com/" }]
              : [],
          );
      });
    }

    test("preserves formatting when linking a selection", async () => {
      await createLink("https://example.com");
      await userEvent.keyboard(
        "{Home}{ArrowRight}{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}",
      );
      await expect.poll(() => window.getSelection()?.toString()).toBe("rag");
      await userEvent.keyboard("{Control>}b{/Control}");
      await sleep(300);
      await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));
      await waitForSelector(".bn-form-popover input[name=url]");
      await userEvent.keyboard("{Control>}a{/Control}");
      await userEvent.keyboard("https://changed.example");
      await userEvent.keyboard("{Enter}");
      await expect
        .poll(() => document.querySelector(EDITOR_SELECTOR)?.textContent)
        .toBe("Paragraph");
      await expect
        .poll(
          () =>
            document.querySelector(`${EDITOR_SELECTOR} strong`)?.textContent,
        )
        .toBe("rag");
      await expect
        .poll(() =>
          Array.from(
            document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR),
          )
            .filter((link) => link.href === "https://changed.example/")
            .map((link) => link.textContent),
        )
        .toEqual(["rag"]);
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
