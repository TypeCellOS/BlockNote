import { toggleBlockConfig } from "@blocknote/core";
import { useState } from "react";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import { useEditorChange } from "../../hooks/useEditorChange.js";

export const Toggle = (
  props: ReactCustomBlockRenderProps<typeof toggleBlockConfig, any, any>,
) => {
  const { block, editor, contentRef } = props;

  const [showChildren, setShowChildren] = useState(true);
  const [hasChildren, setHasChildren] = useState(block.children.length > 0);

  useEditorChange(() => {
    const actualBlock = editor.getBlock(block);

    if (actualBlock?.children.length === 0) {
      setHasChildren(false);
    } else {
      setHasChildren(true);
    }
  });

  return (
    <div>
      <div className="bn-toggle-wrapper" data-show-children={showChildren}>
        <button
          className="bn-toggle-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setShowChildren((showChildren) => !showChildren)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="1em"
            viewBox="0 -960 960 960"
            width="1em"
            fill="currentcolor"
          >
            <path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z" />
          </svg>
        </button>
        <p ref={contentRef} />
      </div>
      {showChildren && !hasChildren && (
        <button
          className="bn-toggle-add-block-button"
          onClick={() => {
            const updatedBlock = editor.updateBlock(block, {
              // Single empty block with default type.
              children: [{}],
            });
            editor.setTextCursorPosition(updatedBlock.children[0].id, "end");
            editor.focus();
          }}
        >
          Empty toggle. Click to add a block.
        </button>
      )}
    </div>
  );
};

export const ToggleBlock = createReactBlockSpec(toggleBlockConfig, {
  render: Toggle,
});
