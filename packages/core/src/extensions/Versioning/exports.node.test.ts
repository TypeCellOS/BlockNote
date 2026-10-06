// @vitest-environment node
import { expect, it } from "vite-plus/test";
import * as core from "../../index.js";
import * as extensions from "../index.js";
import * as y from "../../y/index.js";
import * as yjs from "../../yjs/index.js";

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
  const mainExportsVersioning: "InMemoryVersioningExtension" extends keyof typeof core
    ? true
    : false = false;
  const extensionsExportVersioning: "InMemoryVersioningExtension" extends keyof typeof extensions
    ? true
    : false = true;

  expect(mainExportsVersioning).toBe(false);
  expect(extensionsExportVersioning).toBe(true);
  for (const name of [
    "InMemoryVersioningExtension",
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

it("exports distinct convenience factories only from their backend entry points", () => {
  const exportsLegacyName: "VersioningExtension" extends
    | keyof typeof core
    | keyof typeof extensions
    | keyof typeof y
    | keyof typeof yjs
    ? true
    : false = false;
  expect(exportsLegacyName).toBe(false);
  const factories = [
    {
      entry: extensions,
      name: "InMemoryVersioningExtension",
      factory: extensions.InMemoryVersioningExtension,
    },
    { entry: y, name: "YVersioningExtension", factory: y.YVersioningExtension },
    {
      entry: yjs,
      name: "YjsVersioningExtension",
      factory: yjs.YjsVersioningExtension,
    },
  ];
  for (const { entry, name, factory } of factories) {
    expect(entry).toHaveProperty(name, factory);
    expect(entry).not.toHaveProperty("VersioningExtension");
    expect(core).not.toHaveProperty(name);
    for (const other of factories) {
      if (other.name !== name) {
        expect(entry).not.toHaveProperty(other.name);
        expect(factory).not.toBe(other.factory);
      }
    }
  }
});
