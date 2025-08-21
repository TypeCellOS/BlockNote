import { ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { DeleteLinkButton } from "./DefaultButtons/DeleteLinkButton.js";
import { EditLinkButton } from "./DefaultButtons/EditLinkButton.js";
import { OpenLinkButton } from "./DefaultButtons/OpenLinkButton.js";
import { LinkToolbarProps } from "./LinkToolbarProps.js";

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
  props: LinkToolbarProps & { children?: ReactNode },
) => {
  const Components = useComponentsContext()!;

  return (
    <Components.LinkToolbar.Root
      className={"bn-toolbar bn-link-toolbar"}
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}
    >
      {props.children || (
        <>
          <EditLinkButton
            url={props.url}
            text={props.text}
            editLink={props.editLink}
          />
          <OpenLinkButton url={props.url} />
          <DeleteLinkButton deleteLink={props.deleteLink} />
        </>
      )}
    </Components.LinkToolbar.Root>
  );
};
