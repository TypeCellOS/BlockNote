import { useComponentsContext } from "@blocknote/react";
import { ReactNode, useState } from "react";

import { AIBlockToolbarProps } from "./AIBlockToolbarProps";
import { ShowPromptButton } from "./DefaultButtons/ShowPromptButton";
import { UpdateButton } from "./DefaultButtons/UpdateButton";

export const getAIBlockToolbarItems = (
  props: AIBlockToolbarProps & {
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
export const AIBlockToolbar = (
  props: AIBlockToolbarProps & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  const [updating, setUpdating] = useState(false);

  return (
    <Components.Toolbar.Root className={"bn-toolbar bn-ai-toolbar"}>
      {props.children ||
        getAIBlockToolbarItems({ ...props, updating, setUpdating })}
    </Components.Toolbar.Root>
  );
};
