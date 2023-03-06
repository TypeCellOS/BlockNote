import { Block, PartialBlock } from "../../extensions/Blocks/api/blockTypes";
import {
  InlineContent,
  PartialInlineContent,
  StyledText,
} from "../../extensions/Blocks/api/inlineContentTypes";

function textShorthandToStyledText(
  content: string | StyledText[] = ""
): StyledText[] {
  if (typeof content === "string") {
    return [
      {
        type: "text",
        text: content,
        styles: [],
      },
    ];
  }
  return content;
}

function partialContentToInlineContent(
  content: string | PartialInlineContent[] = ""
): InlineContent[] {
  if (typeof content === "string") {
    return textShorthandToStyledText(content);
  }

  return content.map((partialContent) => {
    if (partialContent.type === "link") {
      return {
        ...partialContent,
        content: textShorthandToStyledText(partialContent.content),
      };
    } else {
      return {
        ...partialContent,
        styles: partialContent.styles || [],
      };
    }
  });
}

export function partialBlockToBlockForTesting(
  partialBlock: PartialBlock
): Block {
  const withDefaults = {
    id: "",
    type: "paragraph" as any,
    props: {} as any,
    content: [],
    children: [],
    ...partialBlock,
  };

  return {
    ...withDefaults,
    content: partialContentToInlineContent(withDefaults.content),
    children: withDefaults.children.map(partialBlockToBlockForTesting),
  };
}
