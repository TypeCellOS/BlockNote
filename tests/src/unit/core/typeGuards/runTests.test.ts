import {
  BlockNoteEditor,
  BlockSchema,
  editorHasBlockType,
  editorHasBlockTypeAndPropsAreValid,
  editorHasBlockTypeAndZodProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { describe, expect, it } from "vitest";
import * as z from "zod/v4";
import { createTestEditor } from "../createTestEditor.js";
import { testSchema } from "../testSchema.js";

// Tests for verifying that type guards which check if an editor's schema
// contains a block (and its props) are working correctly.
// TODO
describe("Editor block schema type guard tests", <BSchema extends
  BlockSchema, I extends InlineContentSchema, S extends StyleSchema>() => {
  const getEditor = createTestEditor(
    testSchema,
  ) as any as () => BlockNoteEditor<BSchema, I, S>;

  it("editorHasBlockType valid", () => {
    const editor = getEditor();

    if (editorHasBlockType(editor, "heading")) {
      // if we're not checking props, we should be able to update the block with any props

      // Below is just for type checking. We don't actually execute this
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _f = () => {
        editor.updateBlock("fake-id", {
          type: "heading",
          props: {
            textColor: "default",
            level: 1,
            anyRandomProp: "anyRandomValue",
          },
        });

        // @ts-expect-error
        editor.updateBlock("fake-id", {
          type: "invalid-type",
          props: {
            textColor: "default",
            level: 1,
          },
        });
      };
    } else {
      throw new Error("Heading block not found");
    }
  });

  it("editorHasBlockType invalid", () => {
    expect(editorHasBlockType(getEditor(), "embed")).toBeFalsy();
  });

  it("editorHasBlockTypeAndPropsAreValid valid", () => {
    const editor = getEditor();

    if (
      editorHasBlockTypeAndPropsAreValid(editor, "heading", {
        level: 3 as const,
      })
    ) {
      // Below is just for type checking. We don't actually execute this
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _f = () => {
        // if we're not checking props, we should be able to update the block with any props
        editor.updateBlock("fake-id", {
          type: "heading",
          props: {
            level: 3,
          },
        });

        // @ts-expect-error
        editor.updateBlock("fake-id", {
          type: "heading",
          props: {
            level: 1,
          },
        });
      };
    } else {
      throw new Error("Heading block not found");
    }
  });

  it("editorHasBlockTypeAndPropsAreValid invalid", () => {
    const editor = getEditor();

    expect(
      editorHasBlockTypeAndPropsAreValid(editor, "heading", {
        level: "hello",
      }),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps valid", () => {
    const editor = getEditor();

    if (
      editorHasBlockTypeAndZodProps(
        editor,
        "heading",
        z.object({
          textColor: z.string().default("default"),
        }),
      )
    ) {
      // Below is just for type checking. We don't actually execute this
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _f = () => {
        // if we're not checking props, we should be able to update the block with any props
        editor.updateBlock("fake-id", {
          type: "heading",
          props: {
            textColor: "red",
          },
        });

        // @ts-expect-error
        editor.updateBlock("fake-id", {
          type: "heading",
          props: {
            level: 1,
          },
        });
      };
    } else {
      throw new Error("Heading block not found");
    }
  });

  it("editorHasBlockTypeAndZodProps invalid", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "heading",
        z.object({
          textColor: z.number(),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps invalid 2", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "heading",
        z.object({
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
          textColor: z.number().default(1),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps invalid 3", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "heading",
        z.object({
          level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
          textColor: z.string().default("default"),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps valid 2", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "numberedListItem",
        z.object({
          start: z.number().optional(),
          textColor: z.string().default("default"),
        }),
      ),
    ).toBeTruthy();
  });

  it("editorHasBlockTypeAndZodProps invalid 4", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "numberedListItem",
        z.object({
          start: z.string().optional(),
          textColor: z.string().default("default"),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorhasBlockType valid customBlockType", () => {
    expect(editorHasBlockType(getEditor(), "simpleImage")).toBeTruthy();
  });

  it("editorHasBlockTypeAndZodProps valid 3", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string().default(""),
          url: z.string().default(""),
        }),
      ),
    ).toBeTruthy();
  });

  it("editorHasBlockTypeAndZodProps invalid customBlockType", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string(),
          url: z.number(),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps valid customBlockType", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.string().default(""),
          url: z.string().default(""),
        }),
      ),
    ).toBeTruthy();
  });

  it("editorHasBlockTypeAndZodProps invalid customBlockType 2", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "simpleImage",
        z.object({
          name: z.boolean().default(false),
          url: z.string().default(""),
        }),
      ),
    ).toBeFalsy();
  });

  it("editorHasBlockTypeAndZodProps invalid customBlockType 3", () => {
    expect(
      editorHasBlockTypeAndZodProps(
        getEditor(),
        "simpleImage",
        z.object({
          name: z
            .union([z.literal("image"), z.literal("photo")])
            .default("photo"),
          url: z.string().default(""),
        }),
      ),
    ).toBeFalsy();
  });
});
