import { ReactNode } from "react";

import { LinkToolbarProps } from "../LinkToolbarProps";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { EditLinkButton } from "./DefaultButtons/EditLinkButton";
import { OpenLinkButton } from "./DefaultButtons/OpenLinkButton";
import { DeleteLinkButton } from "./DefaultButtons/DeleteLinkButton";

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
  if (props.children) {
    return <Toolbar>{props.children}</Toolbar>;
  }

  return (
    <Toolbar
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}>
      <EditLinkButton
        url={props.url}
        text={props.text}
        editLink={props.editLink}
      />
      <OpenLinkButton url={props.url} />
      <DeleteLinkButton deleteLink={props.deleteLink} />
    </Toolbar>
  );
};
