import {
  BlockNoteEditor,
  PartialBlock,
  isLinkInlineContent,
  isStyledTextInlineContent,
} from "@blocknote/core";
import { InvalidOrOk } from "../../../streamTool/streamTool";

function validateInlineContent(content: any, editor: any): boolean {
  const inlineContentConfig =
    editor.schema.inlineContentSchema[
      content.type as keyof typeof editor.schema.inlineContentSchema
    ];

  if (!inlineContentConfig) {
    return false;
  }

  if (isStyledTextInlineContent(content)) {
    if (!("text" in content)) {
      return false;
    }
  }

  if (isLinkInlineContent(content)) {
    if (!("content" in content) || !("href" in content)) {
      return false;
    }

    return validateInlineContent(content.content, editor);
  }

  // TODO: custom ic content
  return true;
}

export function validateBlockFunction(
  block: any,
  editor: BlockNoteEditor<any, any, any>,
  fallbackType?: string
): InvalidOrOk<PartialBlock<any, any, any>> {
  const type = block.type || fallbackType;
  const blockConfig =
    editor.schema.blockSchema[type as keyof typeof editor.schema.blockSchema];

  if (!blockConfig) {
    return {
      result: "invalid",
      reason: "block type not found in editor",
    };
  }

  if (block.children) {
    // LLM tools are not supposed to edit children at this moment
    // return false; TODO, bringing this back breaks markdown tests
  }

  if (blockConfig.content === "none") {
    if (block.content) {
      // no content expected for this block
      return {
        result: "invalid",
        reason: "block content not expected for this block type",
      };
    }
  } else {
    if (!block.content) {
      // return false;
      return {
        result: "ok",
        value: block,
      };
    }

    if (!Array.isArray(block.content)) {
      // content expected for this block
      return {
        result: "invalid",
        reason: "block content must be an array",
      };
    }

    if (blockConfig.content === "table") {
      // no validation for table content (TODO)
      return {
        result: "ok",
        value: block,
      };
    }

    if (
      !(block.content as []).every((content: any) => {
        return validateInlineContent(content, editor);
      })
    ) {
      return {
        result: "invalid",
        reason: "block content must be an array of inline content",
      };
    }
  }
  // TODO: validate props
  return {
    result: "ok",
    value: block,
  };
}
