import type { BlockNoteEditor } from "@blocknote/core";
import { createExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

/**
 * A new, untitled step.
 *
 * It starts with an empty heading rather than an empty paragraph: BlockNote
 * treats a container child holding only an empty paragraph as emptied out
 * and deletes it the next time it repairs the stepper (for example when any
 * other step is removed). An empty heading does not count as empty.
 */
function newStep() {
  return {
    type: "step",
    children: [{ type: "heading", props: { level: 3 } }],
  };
}

/**
 * Enter on an empty block at the end of a step starts the next step, the way
 * Enter on an empty list item starts the next item. BlockNote's own Enter
 * handling would move that block out below the whole stepper, which leaves no
 * keyboard route to a new step.
 *
 * Keyboard shortcuts have no editor-API equivalent, so this is the one piece
 * that needs an extension, attached through `createReactBlockSpec`'s third
 * argument.
 */
const enterStartsNextStep = createExtension({
  key: "stepper-enter-starts-next-step",
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const { block } = editor.getTextCursorPosition();
      const isEmpty =
        Array.isArray(block.content) &&
        block.content.length === 0 &&
        block.children.length === 0;
      if (!isEmpty) {
        return false;
      }
      const step = editor.getParentBlock(block);
      if (step?.type !== "step") {
        return false;
      }

      // The step holds nothing but this empty block - typically the title of
      // a step the previous Enter just started - so this Enter leaves the
      // stepper. The built-in handling would carry the empty heading out;
      // replacing the step with a paragraph below the stepper leaves the
      // caret in plain text instead.
      if (step.children.length === 1) {
        const stepper = editor.getParentBlock(step);
        if (!stepper) {
          throw new Error(`Step "${step.id}" is not inside a stepper`);
        }
        const [landing] = editor.transact(() => {
          const inserted = editor.insertBlocks(
            [{ type: "paragraph" }],
            stepper,
            "after",
          );
          // If this was the stepper's only step, the stepper dissolves too.
          editor.removeBlocks([step]);
          return inserted;
        });
        editor.setTextCursorPosition(landing, "start");
        return true;
      }

      // Otherwise only the *last* block of a step opens the next one.
      if (step.children[step.children.length - 1].id !== block.id) {
        return false;
      }
      const [next] = editor.transact(() => {
        editor.removeBlocks([block]);
        return editor.insertBlocks([newStep()], step, "after");
      });
      editor.setTextCursorPosition(next.children[0], "start");
      return true;
    },
  },
});

/** Appends a step and puts the caret in its title. */
function addStep(editor: BlockNoteEditor<any, any, any>, stepperId: string) {
  // Read back rather than using the render's snapshot of the stepper.
  const stepper = editor.getBlock(stepperId);
  if (!stepper) {
    throw new Error(`Stepper "${stepperId}" is not in the document`);
  }
  const [step] = editor.insertBlocks(
    [newStep()],
    stepper.children[stepper.children.length - 1],
    "after",
  );
  // Land in the new step's title so it can be named straight away.
  editor.setTextCursorPosition(step.children[0], "start");
  editor.focus();
}

/**
 * One step. Like a column, a step is defined only in terms of the thing that
 * holds it, so it declares `placeable: "namedOnly"`: the schema keeps it out
 * of every other position, and moving one out dissolves it into its blocks.
 *
 * A step has no text of its own - its title is simply its first child. The
 * container API cannot express "a block with its own rich text that may only
 * appear inside a stepper": `children.allow` names container types only, and
 * a block with content is not one.
 */
export const createStep = createReactBlockSpec(
  {
    type: "step",
    propSchema: {},
    content: "none",
    children: { allow: "blocks" },
    placeable: "namedOnly",
  },
  {
    render: (props) => (
      <div className="step">
        {/* Chrome, not content: it sits outside `contentRef`. The number
            comes from a CSS counter. */}
        <div className="step-rail" contentEditable={false}>
          <span className="step-number" />
        </div>
        <div className="step-body" ref={props.contentRef} />
      </div>
    ),
  },
);

export const createStepper = createReactBlockSpec(
  {
    type: "stepper",
    propSchema: {},
    content: "none",
    children: { allow: ["step"], min: 1 },
  },
  {
    render: (props) => {
      return (
        <div className="stepper">
          <div className="stepper-steps" ref={props.contentRef} />
          <button
            type="button"
            className="stepper-add"
            contentEditable={false}
            onClick={() => addStep(props.editor, props.block.id)}
          >
            <span className="stepper-add-icon" aria-hidden>
              +
            </span>
            Add step
          </button>
        </div>
      );
    },
  },
  [enterStartsNextStep],
);
