import { afterEach, beforeEach } from "vite-plus/test";

beforeEach(() => {
  if (typeof window === "undefined") {
    return;
  }
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};
});

afterEach(() => {
  if (typeof window === "undefined") {
    return;
  }
  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});
