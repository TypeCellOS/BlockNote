import { server } from "../transport.js";

/** The browser instance the current test is running in. */
export const browserName = server.browser as "chromium" | "firefox" | "webkit";
