import {
  BlockNoteEditor,
  BlockNoteSchema,
  BlockSchema,
  initializeESMDependencies,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { BlockNoteViewRaw } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { afterAll, beforeAll } from "vitest";

import { TestContext } from "./testSchema.js";

export const createTestEditor = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<B, I, S>,
): (() => BlockNoteEditor<B, I, S>) => {
  let editor: BlockNoteEditor<B, I, S>;
  const div = document.createElement("div");

  // Note that we don't necessarily need to mount a root (unless we need a React Context)
  // Currently, we do mount to a root so that it reflects the "production" use-case more closely.

  // However, it would be nice to increased converage and share the same set of tests for these cases:
  // - does render to a root
  // - does not render to a root
  // - runs in server (jsdom) environment using server-util
  let root: Root;

  beforeAll(async () => {
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};

    editor = BlockNoteEditor.create({
      schema,
      trailingBlock: false,
    });

    const el = (
      <TestContext.Provider value={true}>
        <BlockNoteViewRaw editor={editor} />
      </TestContext.Provider>
    );
    root = createRoot(div);
    flushSync(() => {
      // eslint-disable-next-line testing-library/no-render-in-setup
      root.render(el);
    });

    await initializeESMDependencies();
  });

  afterAll(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  return () => editor;
};
