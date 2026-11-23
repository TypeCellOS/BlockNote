// Only these Node-only Playwright/CDP handlers are registered with Vitest.
export { pressKey } from "./keyboard.js";
export { positionalMouse } from "./positionalMouse.js";
export { imeComposition } from "./imeComposition.js";
export { mockCustomBlockImages } from "./mockCustomBlockImages.js";
export { mockVersioningMedia } from "./mockVersioningMedia.js";
export { restoreTouchEmulation } from "./restoreTouchEmulation.js";
