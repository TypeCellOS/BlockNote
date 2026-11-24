import { afterEach, beforeEach } from "vite-plus/test";
import { getTestOptionsHost } from "./src/testUtil/testOptions.js";

beforeEach(() => {
  getTestOptionsHost().__TEST_OPTIONS = {};
});

afterEach(() => {
  delete getTestOptionsHost().__TEST_OPTIONS;
});
