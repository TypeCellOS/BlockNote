import { expect, it } from "vitest";
import { createExtension, ExtensionOptions } from "./BlockNoteExtension.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

const editor = BlockNoteEditor.create();
/**
 * @vitest-environment jsdom
 */
it("creates an extension factory", () => {
  const extension = createExtension(() => {
    return {
      key: "test",
      prosemirrorPlugins: [],
    } as const;
  });

  const extInstance = extension()({ editor });
  expect(extInstance.key).toBe("test");
  expect(extInstance.prosemirrorPlugins).toEqual([]);
});

it("creates an extension factory with options", () => {
  const extension = createExtension((opts: ExtensionOptions<{ x: number }>) => {
    expect(opts.options.x).toBe(1);
    return {
      key: "test",
      prosemirrorPlugins: [],
    } as const;
  });

  const extInstance = extension({ x: 1 })({ editor });
  expect(extInstance.key).toBe("test");
  expect(extInstance.prosemirrorPlugins).toEqual([]);
});

it("creates an extension factory with undefined options", () => {
  const extension = createExtension(
    (opts: ExtensionOptions<{ x: number } | undefined>) => {
      expect(opts.options).toBe(undefined);
      return {
        key: "test",
        prosemirrorPlugins: [],
      } as const;
    },
  );

  const extInstance = extension()({ editor });
  expect(extInstance.key).toBe("test");
  expect(extInstance.prosemirrorPlugins).toEqual([]);
});

it("creates an extension factory from an object", () => {
  const extension = createExtension({
    key: "test",
    prosemirrorPlugins: [],
  } as const);

  const extInstance = extension({ editor });
  expect(extInstance.key).toBe("test");
  expect(extInstance.prosemirrorPlugins).toEqual([]);
});

it("allows arbitrary properties on a no-options extension", () => {
  const extension = createExtension(() => {
    return {
      key: "test",
      prosemirrorPlugins: [],
      arbitraryProperty: "arbitraryValue",
      arbitraryMethod: () => {
        return "arbitraryValue";
      },
    } as const;
  });

  const extInstance = extension()({ editor });
  expect(extInstance.arbitraryProperty).toBe("arbitraryValue");
  expect(extInstance.arbitraryMethod()).toBe("arbitraryValue");
  // @ts-expect-error - this method takes no arguments
  extInstance.arbitraryMethod(90);
  // @ts-expect-error - this property is not defined
  extInstance.nonExistentProperty = "newArbitraryValue";
});

it("allows arbitrary properties on an extension with options", () => {
  const extension = createExtension((opts: ExtensionOptions<{ x: number }>) => {
    expect(opts.options.x).toBe(1);
    return {
      key: "test",
      prosemirrorPlugins: [],
      arbitraryProperty: "arbitraryValue",
      arbitraryMethod: () => {
        return "arbitraryValue";
      },
    } as const;
  });

  const extInstance = extension({ x: 1 })({ editor });
  expect(extInstance.arbitraryProperty).toBe("arbitraryValue");
  // @ts-expect-error - this method takes no arguments
  extInstance.arbitraryMethod(90);
  // @ts-expect-error - this property is not defined
  extInstance.nonExistentProperty = "newArbitraryValue";
});
