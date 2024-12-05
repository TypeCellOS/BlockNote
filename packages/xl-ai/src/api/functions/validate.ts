import { BlockNoteEditor } from "@blocknote/core";

function validateInlineContent(content: any, editor: any): boolean {
  const inlineContentConfig =
    editor.schema.inlineContentSchema[
      content.type as keyof typeof editor.schema.inlineContentSchema
    ];

  if (!inlineContentConfig) {
    return false;
  }

  if (inlineContentConfig === "text") {
    if (!("text" in content)) {
      return false;
    }
  }

  // TODO: validate link / custom ic content
  return true;
}

export function validateBlockFunction(
  block: any,
  editor: BlockNoteEditor<any, any, any>,
  fallbackType?: string
): boolean {
  const type = block.type || fallbackType;
  const blockConfig =
    editor.schema.blockSchema[type as keyof typeof editor.schema.blockSchema];

  if (!blockConfig) {
    return false;
  }

  if (block.children) {
    // LLM tools are not supposed to edit children at this moment
    return false;
  }

  if (blockConfig.content === "none") {
    if (block.content) {
      // no content expected for this block
      return false;
    }
  } else {
    if (!block.content || !Array.isArray(block.content)) {
      // content expected for this block
      return false;
    }

    if (blockConfig.content === "table") {
      // no validation for table content (TODO)
      return true;
    }

    if (
      !(block.content as []).every((content: any) => {
        return validateInlineContent(content, editor);
      })
    ) {
      return false;
    }
  }
  // TODO: validate props
  return true;
}
