// @vitest-environment node
import { DOMSerializer, Schema } from "prosemirror-model";
import { describe, expect, it, vi } from "vite-plus/test";

import type { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type {
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { serializeBlocksInternalHTML } from "./serializeBlocksInternalHTML.js";

type FixtureSchema = Record<
  string,
  { type: string; content: "none"; propSchema: { start: { default: number } } }
>;
type FixtureBlock = PartialBlock<
  FixtureSchema,
  InlineContentSchema,
  StyleSchema
>;

// These tests exercise sibling traversal and attribute placement, not browser
// rendering or parsing. Real HTML round trips and the accessibility tree need
// the browser suite; this deliberately supplies no global document/jsdom.
class ElementAdapter {
  attributes = new Map<string, string>();
  children: ElementAdapter[] = [];

  constructor(readonly name: string) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child: ElementAdapter) {
    if (child.name === "fragment") {
      this.children.push(...child.children);
    } else {
      this.children.push(child);
    }
  }

  append(child: ElementAdapter) {
    this.appendChild(child);
  }
}

vi.mock("../../../../schema/blocks/frame.js", () => ({
  markFrameSlot: vi.fn(),
  renderFrameDOM: (_editor: unknown, block: { type: string; id?: string }) => {
    if (block.type !== "layout" && block.type !== "framed") {
      return undefined;
    }
    const dom = new ElementAdapter(block.type);
    const slot = new ElementAdapter("slot");
    dom.setAttribute("data-id", block.id ?? "");
    dom.appendChild(slot);
    return { dom, slot };
  },
}));

vi.mock("../../../../pm-nodes/BlockContainer.js", () => ({
  setBlockColorAttributes: vi.fn(),
}));

const listTypes = [
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "custom",
  "framed",
];

function fixture(
  types = ["paragraph", "unmarked", "layout", ...listTypes],
  serializeInternalHTML = serializeBlocksInternalHTML,
) {
  const schema = new Schema({
    nodes: {
      doc: { content: "blockGroup" },
      text: {},
      blockGroup: {
        content: "blockContainer*",
        toDOM: () => {
          const dom = new ElementAdapter("group");
          return {
            dom: dom as unknown as HTMLElement,
            contentDOM: dom as unknown as HTMLElement,
          };
        },
      },
      blockContainer: {
        attrs: { id: { default: null } },
        toDOM: (node) => {
          const dom = new ElementAdapter("outer");
          const contentDOM = new ElementAdapter("inner");
          contentDOM.setAttribute("data-id", node.attrs.id);
          dom.appendChild(contentDOM);
          return {
            dom: dom as unknown as HTMLElement,
            contentDOM: contentDOM as unknown as HTMLElement,
          };
        },
      },
      ...Object.fromEntries(
        types.map((type) => [
          type,
          {
            group:
              type === "layout" ? "childContainer bnBlock" : "blockContent",
          },
        ]),
      ),
    },
  });
  const editor = {
    pmSchema: schema,
    schema: {
      blockSchema: Object.fromEntries(
        types.map((type) => [type, { propSchema: {} }]),
      ),
    },
    blockImplementations: Object.fromEntries(
      types.map((type) => [
        type,
        {
          implementation: {
            meta: { listItem: listTypes.includes(type) },
            render: () => ({ dom: new ElementAdapter("content") }),
          },
        },
      ]),
    ),
  } as unknown as BlockNoteEditor<
    FixtureSchema,
    InlineContentSchema,
    StyleSchema
  >;
  const document = {
    createDocumentFragment: () => new ElementAdapter("fragment"),
  } as unknown as Document;
  return function serialize(blocks: FixtureBlock[]) {
    return serializeInternalHTML(
      editor,
      blocks,
      DOMSerializer.fromSchema(schema),
      { document },
    ) as unknown as ElementAdapter;
  };
}

function inner(outer: ElementAdapter) {
  return outer.children[0];
}

function expectRun(outers: ElementAdapter[]) {
  expect(outers[0].getAttribute("role")).toBe("list");
  const items = outers.map(inner);
  for (const item of items) {
    expect(item.getAttribute("role")).toBe("listitem");
    expect(item.getAttribute("id")).toMatch(/^[A-Za-z][\w-]+$/);
  }
  expect(outers[0].getAttribute("aria-owns")).toBe(
    items.length === 1
      ? null
      : items
          .slice(1)
          .map((item) => item.getAttribute("id"))
          .join(" "),
  );
  for (const outer of outers.slice(1)) {
    expect(outer.getAttribute("role")).toBeNull();
    expect(outer.getAttribute("aria-owns")).toBeNull();
  }
}

describe("static internal HTML list relationships", () => {
  it("keeps combined exports from independent module contexts uniquely owned", async () => {
    async function isolatedExport() {
      vi.resetModules();
      const { serializeBlocksInternalHTML } =
        await import("./serializeBlocksInternalHTML.js");
      return fixture(
        undefined,
        serializeBlocksInternalHTML,
      )([
        { type: "bulletListItem", id: "same-a" },
        { type: "bulletListItem", id: "same-b" },
      ]);
    }

    const first = await isolatedExport();
    const second = await isolatedExport();
    expectRun(first.children);
    expectRun(second.children);
    const combined = [...first.children, ...second.children];
    const ids = combined.map((outer) => inner(outer).getAttribute("id"));
    expect(new Set(ids).size).toBe(combined.length);
    for (const outer of combined) {
      for (const id of outer.getAttribute("aria-owns")?.split(" ") ?? []) {
        expect(ids.filter((target) => target === id)).toHaveLength(1);
      }
    }
  });

  it("groups exact consecutive types; numbered restarts do not split runs", () => {
    const result = fixture()([
      { type: "paragraph" },
      { type: "bulletListItem" },
      { type: "bulletListItem" },
      { type: "numberedListItem" },
      { type: "numberedListItem", props: { start: 7 } },
      { type: "bulletListItem" },
      { type: "unmarked" },
      { type: "bulletListItem" },
    ]);
    expectRun(result.children.slice(1, 3));
    expectRun(result.children.slice(3, 5));
    expectRun(result.children.slice(5, 6));
    expectRun(result.children.slice(7, 8));
    expect(inner(result.children[0]).getAttribute("role")).toBeNull();
    expect(result.children[6].getAttribute("role")).toBeNull();
    expect(inner(result.children[6]).getAttribute("role")).toBeNull();
  });

  it.each(listTypes)(
    "supports %s without a numbered-list schema dependency",
    (type) => {
      const result = fixture([type])([{ type }, { type }]);
      expectRun(result.children);
    },
  );

  it("keeps nested and framed content inside its item and layout parents separate", () => {
    const result = fixture()([
      {
        type: "bulletListItem",
        children: [
          { type: "paragraph", id: "nested-text" },
          { type: "bulletListItem" },
          { type: "bulletListItem" },
        ],
      },
      { type: "bulletListItem" },
      {
        type: "layout",
        children: [{ type: "bulletListItem" }, { type: "bulletListItem" }],
      },
      { type: "layout", children: [{ type: "bulletListItem" }] },
      { type: "framed", children: [{ type: "bulletListItem" }] },
    ]);
    expectRun(result.children.slice(0, 2));
    const nested = inner(result.children[0]).children[1];
    expect(inner(nested.children[0]).getAttribute("data-id")).toBe(
      "nested-text",
    );
    expectRun(nested.children.slice(1));
    expectRun(result.children[2].children[0].children);
    expectRun(result.children[3].children[0].children);
    expectRun(result.children.slice(4));
    const frame = inner(result.children[4]).children[0];
    expectRun(frame.children[0].children[1].children);
  });

  it("uses unique serialization IDs even for missing, duplicate, and unsafe block IDs", () => {
    const serialize = fixture();
    const blocks: FixtureBlock[] = [
      { type: "bulletListItem", id: 'unsafe " < & /' },
      { type: "bulletListItem", id: 'unsafe " < & /' },
      { type: "bulletListItem" },
    ];
    const first = serialize(blocks);
    const second = serialize(blocks);
    expectRun(first.children);
    expectRun(second.children);
    const ids = [...first.children, ...second.children].map((outer) =>
      inner(outer).getAttribute("id"),
    );
    expect(new Set(ids).size).toBe(6);
    expect(inner(first.children[0]).getAttribute("data-id")).toBe(blocks[0].id);
  });
});
