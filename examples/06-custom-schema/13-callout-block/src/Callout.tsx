import { createReactBlockSpec } from "@blocknote/react";

const FLAVORS = {
  info: { emoji: "💡", label: "Info" },
  warning: { emoji: "⚠️", label: "Warning" },
  success: { emoji: "✅", label: "Success" },
} as const;

type Flavor = keyof typeof FLAVORS;

export const createCallout = createReactBlockSpec(
  {
    type: "callout" as const,
    propSchema: {
      flavor: {
        default: "info" as const,
        values: ["info", "warning", "success"] as const,
      },
    },
    // The callout's own content is its title: ordinary rich text.
    content: "inline" as const,
    // ...and its children are its body. Declaring them a compartment is what
    // makes the editing gestures treat the box as a unit: Enter at the end of
    // the title starts the body, Shift-Tab doesn't escape it, and a block
    // moved in from below arrives whole.
    children: { allow: "any" as const },
  },
  {
    // The title. `contentRef` marks the element the rich text goes in, exactly
    // as in any other custom block.
    render: (props) => (
      <div className={"callout-title"} ref={props.contentRef} />
    ),

    // The frame around the whole block. BlockNote renders the title *and* the
    // block's nested children into `slot`, so the box wraps both.
    renderFrame: (block, editor) => {
      const dom = document.createElement("div");
      dom.className = "callout";

      const button = document.createElement("button");
      button.className = "callout-flavor";
      button.type = "button";
      button.contentEditable = "false";

      const slot = document.createElement("div");
      slot.className = "callout-body";

      // The button goes after the slot: BlockNote's drag handle hovers over
      // the block's left edge, so a control there would sit under it.
      dom.append(slot, button);

      const paint = (flavor: Flavor) => {
        dom.dataset.flavor = flavor;
        button.textContent = FLAVORS[flavor].emoji;
        button.title = `${FLAVORS[flavor].label} — click to change`;
      };
      paint(block.props.flavor);

      // Cycles the flavor. `updateBlock` is the normal editor API; the frame
      // is told about the new props through `update` below.
      button.addEventListener("click", () => {
        const flavors = Object.keys(FLAVORS) as Flavor[];
        const current = dom.dataset.flavor as Flavor;
        const next = flavors[(flavors.indexOf(current) + 1) % flavors.length];

        editor.updateBlock(block, { props: { flavor: next } });
      });

      return { dom, slot, update: (updated) => paint(updated.props.flavor) };
    },
  },
);
