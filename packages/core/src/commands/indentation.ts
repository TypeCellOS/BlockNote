import {
  $getNearestBlockElementAncestorOrThrow,
  mergeRegister,
} from "@lexical/utils";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  ElementNode,
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  LexicalNode,
  OUTDENT_CONTENT_COMMAND,
} from "lexical";
import {
  $createChildgroupNode,
  $isChildgroupNode,
} from "../nodes/ChildgroupNode";

function handleIndentAndOutdent(
  insertTab: (node: LexicalNode) => void,
  indentOrOutdent: (block: ElementNode) => void
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  const alreadyHandled = new Set();
  const nodes = selection.getNodes();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const key = node.getKey();
    if (alreadyHandled.has(key)) {
      continue;
    }
    alreadyHandled.add(key);
    const parentBlock = $getNearestBlockElementAncestorOrThrow(node);
    if (parentBlock.canInsertTab()) {
      insertTab(node);
    } else if (parentBlock.canIndent()) {
      indentOrOutdent(parentBlock);
    }
  }
}

export function registerIndentationCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        handleIndentAndOutdent(
          () => {
            editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "\t");
          },
          (block) => {
            const prev = block.getPreviousSibling();
            if ($isElementNode(prev)) {
              let lc: any = prev.getLastChild();
              if (!$isChildgroupNode(lc)) {
                lc = $createChildgroupNode();
                prev.append(lc);
              }
              lc.append(block);
            }
            // const indent = block.getIndent();
            // if (indent !== 10) {
            //   block.setIndent(indent + 1);
            // }
          }
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      () => {
        handleIndentAndOutdent(
          (node) => {
            if ($isTextNode(node)) {
              const textContent = node.getTextContent();
              const character = textContent[textContent.length - 1];
              if (character === "\t") {
                editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
              }
            }
          },
          (block) => {
            const parent = block.getParent();
            if (parent && parent.getType() === "childgroup") {
              // const index = block.getIndexWithinParent();
              // const newParent = parent.getParent();
              // if (!newParent) {
              //   return;
              // }
              const newChildren = block.getNextSiblings();

              if (newChildren.length) {
                let lc: any = block.getLastChild();
                if (!$isChildgroupNode(lc)) {
                  lc = $createChildgroupNode();
                  block.append(lc);
                }
                (lc as ElementNode).append(...newChildren);
              }

              parent.getParent()!.insertAfter(block);
              if (parent.isEmpty()) {
                parent.remove();
              }
              // newParent.insertAfter()
            }
            // const indent = block.getIndent();
            // if (indent !== 0) {
            //   block.setIndent(indent - 1);
            // }
          }
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH
    )
  );
}
