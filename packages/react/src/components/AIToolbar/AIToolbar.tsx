import { ReactNode, useState } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext";
import { AIToolbarProps } from "./AIToolbarProps";
import { ShowPromptButton } from "./DefaultButtons/ShowPromptButton";
import { UpdateButton } from "./DefaultButtons/UpdateButton";

export const getAIToolbarItems = (
  props: AIToolbarProps & {
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
): JSX.Element[] => [
  <ShowPromptButton key={"show-prompt-button"} {...props} />,
  <UpdateButton key={"update-button"} {...props} />,
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
export const AIToolbar = (props: AIToolbarProps & { children?: ReactNode }) => {
  const Components = useComponentsContext()!;

  const [updating, setUpdating] = useState(false);

  return (
    <Components.AIToolbar.Root className={"bn-toolbar bn-ai-toolbar"}>
      {props.children || getAIToolbarItems({ ...props, updating, setUpdating })}
    </Components.AIToolbar.Root>
  );
};
