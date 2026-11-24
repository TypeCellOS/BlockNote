import { afterEach, beforeEach } from "vite-plus/test";
import { testOptionsHost } from "./src/integration/support/testOptions.js";

beforeEach(() => {
  testOptionsHost.__TEST_OPTIONS = {};
});

afterEach(() => {
  delete testOptionsHost.__TEST_OPTIONS;
});
