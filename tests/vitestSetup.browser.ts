import { afterEach, beforeAll, beforeEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser/context";

// Browser-mode setup. Unlike the jsdom `vitestSetup.ts`, we don't mock
// ClipboardEvent/DragEvent/matchMedia here — the real browser provides them.
// We only seed the `window.__TEST_OPTIONS` object that examples read from
// (e.g. the AI example uses `mockID`), replacing the Playwright init script
// that used to live in `src/setup/setupScript.ts`.

// Size the test iframe to 1280x720. The playwright `contextOptions.viewport`
// in vite.config.browser.ts sizes the OUTER browser window, but vitest renders
// each test inside an iframe that defaults to a much smaller size (~333px wide
// — narrow enough to wrap menus weirdly and skew screenshots). `page.viewport`
// resizes that iframe. Run before all tests in the file so every test sees the
// right size from the first render.
beforeAll(async () => {
  await page.viewport(1280, 720);

  // Match the playground's editor framing so screenshots line up with what
  // users see at https://www.blocknotejs.org/examples (max-width 731px,
  // horizontally centred, slight top padding). Without this the editor
  // stretches the full 1280px and snapshot baselines drift from production.
  const style = document.createElement("style");
  style.textContent = `.bn-container { max-width: 731px; margin: 0 auto; padding-top: 8px; }`;
  document.head.appendChild(style);
});

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
