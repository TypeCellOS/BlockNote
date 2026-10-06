// @vitest-environment node
import { expect, it } from "vite-plus/test";
import * as core from "../../index.js";
import * as extensions from "../index.js";

it("exports built-in extensions only from the extensions entry point", () => {
  const mainExportsExtensions: Extract<
    keyof typeof core,
    keyof typeof extensions
  > extends never
    ? false
    : true = false;

  expect(mainExportsExtensions).toBe(false);
  for (const name of Object.keys(extensions)) {
    expect(core).not.toHaveProperty(name);
  }
  expect(extensions).toHaveProperty("UniqueID");
  expect(core).toHaveProperty("BlockNoteEditor");
  expect(core).toHaveProperty("BlockNoteSchema");
  expect(core).toHaveProperty("createExtension");
});

it("exports versioning only from the extensions entry point", () => {
  const mainExportsVersioning: "VersioningExtension" extends keyof typeof core
    ? true
    : false = false;
  const extensionsExportVersioning: "VersioningExtension" extends keyof typeof extensions
    ? true
    : false = true;

  expect(mainExportsVersioning).toBe(false);
  expect(extensionsExportVersioning).toBe(true);
  for (const name of [
    "VersioningExtension",
    "createVersioningExtension",
    "createVersioning",
    "createLocalVersioning",
    "scheduleScrollToFirstChange",
    "scrollToFirstChange",
    "SCROLL_TO_FIRST_CHANGE_DELAY_MS",
  ]) {
    expect(core).not.toHaveProperty(name);
    expect(extensions).toHaveProperty(name);
  }
});
