import {
  BrowserContext,
  BrowserContextOptions,
  test as base,
  expect,
} from "@playwright/test";

export type TestOptions = {
  mockID: number | undefined;
};

export const test = base.extend<TestOptions>({
  browser: async ({ browser }, use) => {
    const oldFunc = browser.newContext;
    browser.newContext = async (options?: BrowserContextOptions) => {
      const ret: BrowserContext = await oldFunc.call(browser, options);

      await ret.addInitScript({
        content: `window.__TEST_OPTIONS = window.__TEST_OPTIONS || {}`,
      });

      return ret;
    };
    await use(browser);
  },
  context: async ({ context }, use) => {
    await context.addInitScript({
      content: `window.__TEST_OPTIONS = window.__TEST_OPTIONS || {}`,
    });
    await use(context);
  },
});

export { expect } from "@playwright/test";
