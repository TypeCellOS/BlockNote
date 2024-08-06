import { ReactNode, useState } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext";
import { AIInlineToolbarProps } from "./AIInlineToolbarProps";
import { AcceptButton } from "./DefaultButtons/AcceptButton";
import { RetryButton } from "./DefaultButtons/RetryButton";
import { RevertButton } from "./DefaultButtons/RevertButton";

export const getAIBlockToolbarItems = (
  props: AIInlineToolbarProps & {
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
): JSX.Element[] => [
  <AcceptButton key={"update-button"} {...props} />,
  <RetryButton {...props} />,
  <RevertButton {...props} />,
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

  const [updating, setUpdating] = useState(true);

  return (
    <Components.AIBlockToolbar.Root className={"bn-toolbar bn-ai-toolbar"}>
      {props.children ||
        getAIBlockToolbarItems({ ...props, updating, setUpdating })}
    </Components.AIBlockToolbar.Root>
  );
};
