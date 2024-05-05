import { ReactNode } from "react";

import { DeleteLinkButton } from "./DefaultButtons/DeleteLinkButton";
import { EditLinkButton } from "./DefaultButtons/EditLinkButton";
import { OpenLinkButton } from "./DefaultButtons/OpenLinkButton";
import { LinkToolbarProps } from "./LinkToolbarProps";
import { useComponentsContext } from "../../editor/ComponentsContext";

/**
 * By default, the LinkToolbar component will render with default buttons.
 * However, you can override the selects/buttons to render by passing
 * children. The children you pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export const LinkToolbar = (
  props: LinkToolbarProps & { children?: ReactNode }
) => {
  const Components = useComponentsContext()!;

  if (props.children) {
    return (
      <Components.LinkToolbar.Root className={"bn-toolbar bn-link-toolbar"}>
        {props.children}
      </Components.LinkToolbar.Root>
    );
  }

  return (
    <Components.LinkToolbar.Root
      className={"bn-toolbar bn-link-toolbar"}
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}>
      <EditLinkButton
        url={props.url}
        text={props.text}
        editLink={props.editLink}
      />
      <OpenLinkButton url={props.url} />
      <DeleteLinkButton deleteLink={props.deleteLink} />
    </Components.LinkToolbar.Root>
  );
};
