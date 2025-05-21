import {
  BlockConfig,
  BlockFromConfig,
  createBlockSpec,
  PropSchema,
} from "../../schema/index.js";

import { defaultProps } from "../defaultProps.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const collapsableHeadingPropSchema = {
  ...defaultProps,
  level: { default: 1, values: [1, 2, 3] as const },
  collapsed: { default: false },
} satisfies PropSchema;

export const collapsableHeadingBlockConfig = {
  type: "collapsableHeading" as const,
  propSchema: collapsableHeadingPropSchema,
  content: "inline",
  isFileBlock: false,
} satisfies BlockConfig;

export const collapsableHeadingRender = (
  block: BlockFromConfig<typeof collapsableHeadingBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) => {
  const collapseButton = document.createElement("button");
  collapseButton.className = "bn-collapse-button";
  collapseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentcolor"><path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z"/></svg>';
  const onClick = () => {
    editor.updateBlock(block, {
      props: {
        collapsed: !block.props.collapsed,
      },
    });
  };
  collapseButton.addEventListener("mousedown", onClick);

  const heading = document.createElement(`h${block.props.level}`);

  const collapseWrapper = document.createElement("div");
  collapseWrapper.className = "bn-collapse-wrapper";
  collapseWrapper.appendChild(collapseButton);
  collapseWrapper.appendChild(heading);

  const addBlockButton = document.createElement("button");
  addBlockButton.className = "bn-collapse-add-block-button";
  addBlockButton.textContent = "Empty toggle. Click to add a block.";
  const onClick2 = () => {
    editor.transact(() => {
      const updatedBlock = editor.updateBlock(block, {
        children: [
          {
            type: "paragraph",
          },
        ],
      });
      editor.setTextCursorPosition(updatedBlock.children[0].id, "end");
      editor.focus();
    });
  };
  addBlockButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  addBlockButton.addEventListener("click", onClick2);

  const dom = document.createElement("div");
  dom.appendChild(collapseWrapper);

  if (!block.props.collapsed && block.children.length === 0) {
    dom.appendChild(addBlockButton);
  }

  // Hack to force a re-render if the block has changed from having children to
  // not having children or vice versa.
  const d = editor.onChange(() => {
    const actualBlock = editor.getBlock(block);
    if (!actualBlock) {
      return;
    }

    if (
      (block.children.length === 0 && actualBlock.children.length > 0) ||
      (block.children.length > 0 && actualBlock.children.length === 0)
    ) {
      collapseWrapper.setAttribute("data-force-update", "true");
      collapseWrapper.removeAttribute("data-force-update");
    }
  });

  return {
    dom,
    contentDOM: heading,
    destroy: () => {
      collapseButton.removeEventListener("mousedown", onClick);
      if (addBlockButton) {
        addBlockButton.removeEventListener("mousedown", onClick2);
      }
      d?.();
    },
  };
};

export const CollapsableHeadingBlock = createBlockSpec(
  collapsableHeadingBlockConfig,
  {
    render: collapsableHeadingRender,
  },
);
