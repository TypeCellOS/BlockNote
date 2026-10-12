import { test as playwrightTest } from "@playwright/test";
import type { ScreenReaderPlaywright } from "@guidepup/playwright";

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";
export type { ScreenReaderPlaywright } from "@guidepup/playwright";

// GuidePup owns screen-reader startup/cleanup. The browser-only runner supplies
// undefined for that one fixture so both runners can execute the same tests.
// Import GuidePup only in native mode: importing it on Linux throws.
export const test = process.env.BLOCKNOTE_SCREEN_READER
  ? (await import("@guidepup/playwright")).screenReaderTest
  : playwrightTest.extend<{ screenReader: ScreenReaderPlaywright | undefined }>(
      {
        screenReader: undefined,
      },
    );
