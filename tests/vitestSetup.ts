import { afterEach, beforeEach } from "vite-plus/test";
import { testOptionsHost } from "./src/integration/shared/testOptions.js";

beforeEach(() => {
  testOptionsHost.__TEST_OPTIONS = {};
});

afterEach(() => {
  delete testOptionsHost.__TEST_OPTIONS;
});
