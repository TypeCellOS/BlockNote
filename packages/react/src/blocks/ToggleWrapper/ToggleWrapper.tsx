import {
  Block,
  defaultToggledState,
  UnreachableCaseError,
} from "@blocknote/core";
import { ReactNode, useReducer, useState } from "react";

import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec.js";
import { useEditorChange } from "../../hooks/useEditorChange.js";

const showChildrenReducer = (
  showChildren: boolean,
  action:
    | {
        type: "toggled";
      }
    | {
        type: "childAdded";
      }
    | {
        type: "lastChildRemoved";
      },
) => {
  if (action.type === "toggled") {
    return !showChildren;
  }

  if (action.type === "childAdded") {
    return true;
  }

  if (action.type === "lastChildRemoved") {
    return false;
  }

  throw new UnreachableCaseError(action);
};

export const ToggleWrapper = (
  props: Omit<ReactCustomBlockRenderProps<any, any, any>, "contentRef"> & {
    children: ReactNode;
    toggledState?: {
      set: (block: Block<any, any, any>, isToggled: boolean) => void;
      get: (block: Block<any, any, any>) => boolean;
    };
  },
) => {
  const { block, editor, children, toggledState } = props;

  const [showChildren, dispatch] = useReducer(
    showChildrenReducer,
    (toggledState || defaultToggledState).get(block),
  );
  const [childCount, setChildCount] = useState(block.children.length);

  const handleToggle = (block: Block<any, any, any>) => {
    (toggledState || defaultToggledState).set(
      editor.getBlock(block)!,
      !showChildren,
    );
    dispatch({
      type: "toggled",
    });
  };

  const handleChildAdded = (block: Block<any, any, any>) => {
    (toggledState || defaultToggledState).set(block, true);
    dispatch({
      type: "childAdded",
    });
  };

  const handleLastChildRemoved = (block: Block<any, any, any>) => {
    (toggledState || defaultToggledState).set(block, false);
    dispatch({
      type: "lastChildRemoved",
    });
  };

  useEditorChange(() => {
    if ("isToggleable" in block.props && !block.props.isToggleable) {
      return;
    }

    const newBlock = editor.getBlock(block)!;
    const newChildCount = newBlock.children.length ?? 0;

    if (newChildCount > childCount) {
      // If a child block is added while children are hidden, show children.
      if (!showChildren) {
        handleChildAdded(newBlock);
      }
    } else if (newChildCount === 0 && newChildCount < childCount) {
      // If the last child block is removed while children are shown, hide
      // children.
      if (showChildren) {
        handleLastChildRemoved(newBlock);
      }
    }

    setChildCount(newChildCount);
  });

  if ("isToggleable" in block.props && !block.props.isToggleable) {
    return children;
  }

  return (
    <div>
      <div className="bn-toggle-wrapper" data-show-children={showChildren}>
        <button
          className="bn-toggle-button"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleToggle(editor.getBlock(block)!)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="1em"
            viewBox="0 -960 960 960"
            width="1em"
            fill="currentcolor"
          >
            {/* https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed */}
            <path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z" />
          </svg>
        </button>
        {children}
      </div>
      {showChildren && childCount === 0 && (
        <button
          className="bn-toggle-add-block-button"
          type="button"
          onClick={() => {
            const updatedBlock = editor.updateBlock(block, {
              // Single empty block with default type.
              children: [{}],
            });
            editor.setTextCursorPosition(updatedBlock.children[0].id, "end");
            editor.focus();
          }}
        >
          {editor.dictionary.toggle_blocks.add_block_button}
        </button>
      )}
    </div>
  );
};
