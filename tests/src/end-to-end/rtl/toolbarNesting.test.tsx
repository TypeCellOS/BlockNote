import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  MobileFormattingToolbarController,
  NestBlockButton,
  UnnestBlockButton,
  useCreateBlockNote,
} from "@blocknote/react";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

function NestingToolbar() {
  return (
    <FormattingToolbar>
      <NestBlockButton />
      <UnnestBlockButton />
    </FormattingToolbar>
  );
}

function Editor({ dir, mobile }: { dir: "ltr" | "rtl"; mobile: boolean }) {
  const editor = useCreateBlockNote({
    initialContent: [
      { id: "parent", type: "paragraph", content: "Parent — אב" },
      { id: "child", type: "paragraph", content: "Child — ילד" },
    ],
  });
  return (
    <BlockNoteView editor={editor} dir={dir} formattingToolbar={false}>
      {mobile ? (
        <MobileFormattingToolbarController formattingToolbar={NestingToolbar} />
      ) : (
        <NestingToolbar />
      )}
    </BlockNoteView>
  );
}

afterEach(async () => {
  await cleanup();
  await page.viewport(1280, 720);
});

test.each([
  { dir: "rtl", mobile: true },
  { dir: "ltr", mobile: true },
  { dir: "rtl", mobile: false },
  { dir: "ltr", mobile: false },
] as const)(
  "$dir nesting (mobile: $mobile) changes block depth",
  async (props) => {
    await page.viewport(393, 727);
    await render(<Editor {...props} />);
    const child = await waitForSelector(
      '.bn-block[data-id="child"] > .bn-block-content',
    );
    await userEvent.click(child);
    if (props.mobile) {
      await page.viewport(393, 427);
    }
    const nest = await waitForSelector('[data-test="nestBlock"]');
    const unnest = page.elementLocator(
      await waitForSelector('[data-test="unnestBlock"]'),
    );
    await expect.element(page.elementLocator(nest)).toBeEnabled();
    await expect.element(unnest).toBeDisabled();
    await userEvent.click(nest);
    await expect
      .poll(() =>
        document.querySelector(
          '.bn-block[data-id="parent"] > .bn-block-group .bn-block[data-id="child"]',
        ),
      )
      .not.toBeNull();
    const parent = await waitForSelector(
      '.bn-block[data-id="parent"] > .bn-block-content',
    );
    const nestedChild = await waitForSelector(
      '.bn-block[data-id="child"] > .bn-block-content',
    );
    // Nesting animates the indentation; wait for the final geometry.
    await expect
      .poll(() => {
        const parentRect = parent.getBoundingClientRect();
        const childRect = nestedChild.getBoundingClientRect();
        return props.dir === "rtl"
          ? parentRect.right - childRect.right
          : childRect.left - parentRect.left;
      })
      .toBe(24);
    await expect.element(unnest).toBeEnabled();
    await userEvent.click(unnest);
    await expect
      .poll(() =>
        document.querySelector(
          '.bn-block[data-id="parent"] > .bn-block-group .bn-block[data-id="child"]',
        ),
      )
      .toBeNull();
    await expect.element(unnest).toBeDisabled();
  },
);
