import "@blocknote/core/fonts/inter.css";
import { ar, en, he } from "@blocknote/core/locales";
import { MobileFormattingToolbarController } from "@blocknote/react";
import { afterEach, expect } from "vite-plus/test";

import { browserName, page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

afterEach(async () => {
  await page.viewport(1280, 720);
});

// Mount the real mobile controller explicitly: direction/overflow are DOM
// behavior, not touch-only behavior. Resizing exercises its real keyboard hook.
// These desktop browser instances can capture screenshots without disrupting
// the Android context's touch emulation (no screenshotFull/iframe resizing).
it.for([
  { language: "he", dictionary: he },
  { language: "ar", dictionary: ar },
  { language: "en", dictionary: en },
])(
  "$language mobile toolbar starts at the reading edge",
  async ({ language, dictionary }, { setupEditor, selectText }) => {
    await page.viewport(393, 727);
    const { editor } = await setupEditor({
      dictionary,
      initialContent: [
        { type: "paragraph", content: "שלום — مرحباً — English (123)" },
      ],
      props: {
        dir: dictionary === en ? "ltr" : "rtl",
        lang: dictionary.locale,
        formattingToolbar: false,
      },
      children: <MobileFormattingToolbarController />,
    });
    await userEvent.click(await waitForSelector(".bn-inline-content"));
    await page.viewport(393, 427);
    const toolbar = await waitForSelector(
      ".bn-mobile-formatting-toolbar .bn-toolbar",
    );
    const select = page.getByText(dictionary.slash_menu.paragraph.title, {
      exact: true,
    });
    const bold = toolbar.querySelector<HTMLElement>('[data-test="bold"]')!;

    await expect
      .poll(() => {
        const first = select.element().getBoundingClientRect();
        const next = bold.getBoundingClientRect();
        return language === "en"
          ? first.left < next.left
          : first.right > next.right;
      })
      .toBe(true);

    if (language === "he" && browserName === "chromium") {
      await expect
        .element(document.documentElement)
        .toMatchScreenshot(`${language}-mobile-toolbar`);
    }

    await userEvent.click(select);
    const heading = page.getByText(dictionary.slash_menu.heading_2.title, {
      exact: true,
    });
    await expect.element(heading).toBeVisible();
    if (language === "he" && browserName === "chromium") {
      await expect
        .element(document.documentElement)
        .toMatchScreenshot(`${language}-mobile-block-menu`);
    }
    await userEvent.click(heading);
    await expect
      .poll(() => document.querySelector(".bn-editor h2")?.textContent)
      .toContain("English (123)");
    await expect.element(page.elementLocator(toolbar)).toBeVisible();

    // The end of the strip must remain reachable in either reading direction.
    // Use the editor's selection command so selection is committed before the
    // link control is read; a DOM range can race a pending editor transaction.
    selectText(editor, "שלום — مرحباً — English (123)");
    const link = await waitForSelector(
      '.bn-mobile-formatting-toolbar [data-test="createLink"]',
    );
    toolbar.scrollLeft =
      language === "en" ? toolbar.scrollWidth : -toolbar.scrollWidth;
    await expect
      .poll(() => {
        const bounds = link.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= window.innerWidth;
      })
      .toBe(true);
    await userEvent.click(link);
    const url = await waitForSelector('input[name="url"]');
    await userEvent.fill(url, "https://example.com/rtl?q=123");
    if (language === "he" && browserName === "chromium") {
      await expect
        .element(document.documentElement)
        .toMatchScreenshot(`${language}-mobile-link`);
    }
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("link"))
      .toHaveAttribute("href", "https://example.com/rtl?q=123");
    await expect.element(page.elementLocator(toolbar)).toBeVisible();
  },
);
