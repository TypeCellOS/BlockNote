import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";

// The content-bearing container schema shared by `contentContainers.test.ts`
// (node: document model) and `contentContainers.browser.test.ts` (real browser:
// keymap), so both halves are describing the same blocks.

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// The toggle shape: a container with its own inline content (its "title") as
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

// The same, but allowed to hold no children at all — the `min: 0` shape that
// has no addressable child to fall back on.
const OptionalToggle = createBlockSpec(
  {
    type: "optionalToggle" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", min: 0 },
  },
  { render: renderDiv },
)();

// A content-bearing container that unwraps as it empties out, paired with the
// pure container below. Repair has to treat these two identically apart from
// the title.
const TitledGrid = createBlockSpec(
  {
    type: "titledGrid" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", min: 2, whenEmptied: "unwrap" },
  },
  { render: renderDiv },
)();

const PureGrid = createBlockSpec(
  {
    type: "pureGrid" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", min: 2, whenEmptied: "unwrap" },
  },
  { render: renderDiv },
)();

// The toggle shape with a sealed boundary: its title and children are a
// compartment that outside content never implicitly merges into or out of.
const SealedToggle = createBlockSpec(
  {
    type: "sealedToggle" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any", boundary: "sealed" },
  },
  { render: renderDiv },
)();

// A pure container, for the "never regress" half of every pair.
const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", default: [{ type: "paragraph" }] },
  },
  { render: renderDiv },
)();

// A pure container allowed to hold nothing — the shape that has no child to
// place a text cursor in.
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
    pureGrid: PureGrid,
    callout: Callout,
    emptyBox: EmptyBox,
  } as const,
});
