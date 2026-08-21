import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";

// The content-bearing container schema shared by `contentContainers.test.ts`
// (node: document model) and `contentContainers.browser.test.ts` (browser:
// keymap), so both suites test the same blocks.

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// A toggle-shaped container with its own inline content (its "title") as
// well as children. `min` defaults to 1, so it always keeps at least one
// child.
const Toggle = createBlockSpec(
  {
    type: "toggle" as const,
    propSchema: { open: { default: true } },
    content: "inline",
    children: { allow: "any" },
  },
  { render: renderDiv },
)();

// The same, but allowed to hold no children at all. With `min: 0` there is
// no addressable child to fall back on.
const OptionalToggle = createBlockSpec(
  {
    type: "optionalToggle" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", min: 0 },
  },
  { render: renderDiv },
)();

// A content-bearing container that unwraps as it empties out. Repair has to
// treat it identically to a pure one apart from the title.
const TitledGrid = createBlockSpec(
  {
    type: "titledGrid" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", min: 2, whenEmptied: "unwrap" },
  },
  { render: renderDiv },
)();

// The toggle shape with a sealed boundary. Outside content never implicitly
// merges into or out of its title and children.
const SealedToggle = createBlockSpec(
  {
    type: "sealedToggle" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", boundary: "sealed" },
  },
  { render: renderDiv },
)();

// A pure container, used as the no-regression counterpart in each test pair.
const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", default: [{ type: "paragraph" }] },
  },
  { render: renderDiv },
)();

// A pure container allowed to hold nothing, so there is no child to place a
// text cursor in.
const EmptyBox = createBlockSpec(
  {
    type: "emptyBox" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", min: 0 },
  },
  { render: renderDiv },
)();

export const contentContainerSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    toggle: Toggle,
    optionalToggle: OptionalToggle,
    sealedToggle: SealedToggle,
    titledGrid: TitledGrid,
    callout: Callout,
    emptyBox: EmptyBox,
  } as const,
});
