import { BlockConfig, PropSchema, defaultProps } from "@blocknote/core";
import {
  ReactCustomBlockRenderProps,
  createReactBlockSpec,
} from "@blocknote/react";
import { KeyboardEvent, useCallback, useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import { mockAIReplaceBlockContent } from "./mockAIFunctions.js";

export const aiPropSchema = {
  ...defaultProps,
  prompt: {
    default: "" as const,
  },
  timeGenerated: {
    default: 0 as const,
  },
} satisfies PropSchema;

export const aiBlockConfig = {
  type: "ai" as const,
  propSchema: aiPropSchema,
  content: "inline",
} satisfies BlockConfig;

export const AIRender = (
  props: ReactCustomBlockRenderProps<typeof aiBlockConfig, any, any>
) => {
  const [generating, setGenerating] = useState(false);

  const replaceContent = useCallback(async () => {
    setGenerating(true);

    const prompt = await props.editor.blocksToMarkdownLossy([
      props.block as any,
    ]);
    await mockAIReplaceBlockContent(props.editor, prompt, props.block);

    setGenerating(false);

    props.editor.updateBlock(props.block, {
      props: {
        timeGenerated: Date.now(),
      },
    });
  }, [props.block, props.editor]);

  const replaceContentOnEnter = useCallback(
    async (event: KeyboardEvent) => {
      const currentBlock = props.editor.getTextCursorPosition().block;

      if (
        event.key === "Enter" &&
        !props.editor.getSelection() &&
        currentBlock.id === props.block.id &&
        currentBlock.props.prompt === ""
      ) {
        event.preventDefault();
        event.stopPropagation();

        await replaceContent();
      }
    },
    [props.block, props.editor, replaceContent]
  );

  if (props.block.props.prompt) {
    return <p ref={props.contentRef} />;
  }

  return (
    <div className="bn-ai-prompt-box">
      <RiSparkling2Fill />
      <span ref={props.contentRef} onKeyDownCapture={replaceContentOnEnter} />
      <button onClick={replaceContent}>
        {generating ? "Generating..." : "Generate"}
      </button>
    </div>
  );
};

export const AIToExternalHTML = (
  props: ReactCustomBlockRenderProps<typeof aiBlockConfig, any, any>
) => <p ref={props.contentRef} />;

export const AIBlock = createReactBlockSpec(aiBlockConfig, {
  render: AIRender,
  toExternalHTML: AIToExternalHTML,
});
