import { Block } from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import { ReactNode, useEffect, useState } from "react";

import { useBlockNoteEditor } from "@blocknote/react";
import {
  mockAIInsertAfterSelection,
  mockAIReplaceSelection,
} from "../../blocks/AIBlockContent/mockAIFunctions";
import { AIInlineToolbarProps } from "./AIInlineToolbarProps";
import { AcceptButton } from "./DefaultButtons/AcceptButton";
import { RetryButton } from "./DefaultButtons/RetryButton";
import { RevertButton } from "./DefaultButtons/RevertButton";

export const getAIInlineToolbarItems = (
  props: AIInlineToolbarProps & {
    originalBlocks: Block<any, any, any>[];
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
): JSX.Element[] => [
  <AcceptButton key={"accept-button"} {...props} />,
  <RetryButton key={"retry-button"} {...props} />,
  <RevertButton key={"revert-button"} {...props} />,
];

/**
 * By default, the AIToolbar component will render with default buttons.
 * However, you can override the selects/buttons to render by passing children.
 * The children you pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom buttons: Buttons made using the Components.AIToolbar.Button
 * component from the component context.
 */
export const AIInlineToolbar = (
  props: AIInlineToolbarProps & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const [originalBlocks, setOriginalBlocks] = useState<Block<any, any, any>[]>(
    []
  );
  const [updating, setUpdating] = useState(true);

  useEffect(() => {
    // TODO: Throws an error when strict mode is active because the target
    //  blocks couldn't be found. Works fine otherwise.
    if (props.operation === "replaceSelection") {
      mockAIReplaceSelection(editor, props.prompt).then((originalBlocks) => {
        setOriginalBlocks(originalBlocks);
        setUpdating(false);
      });
    } else {
      mockAIInsertAfterSelection(editor, props.prompt).then(
        (originalBlocks) => {
          setOriginalBlocks(originalBlocks);
          setUpdating(false);
        }
      );
    }
  }, []);

  return (
    <Components.Toolbar.Root className={"bn-toolbar bn-ai-toolbar"}>
      {props.children ||
        getAIInlineToolbarItems({
          ...props,
          originalBlocks,
          updating,
          setUpdating,
        })}
    </Components.Toolbar.Root>
  );
};
