import { ReactNode } from "react";

import { HyperlinkToolbarProps } from "../HyperlinkToolbarProps";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { EditLinkButton } from "./DefaultButtons/EditLinkButton";
import { OpenLinkButton } from "./DefaultButtons/OpenLinkButton";
import { DeleteLinkButton } from "./DefaultButtons/DeleteLinkButton";

/**
 * By default, the HyperlinkToolbar component will render with default buttons.
 * However, you can override the dropdowns/buttons to render by passing
 * children. The children you pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom dropdowns: The `ToolbarDropdown` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export const HyperlinkToolbar = (
  props: HyperlinkToolbarProps & { children?: ReactNode }
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
        editHyperlink={props.editHyperlink}
      />
      <OpenLinkButton url={props.url} />
      <DeleteLinkButton deleteHyperlink={props.deleteHyperlink} />
    </Toolbar>
  );
};
