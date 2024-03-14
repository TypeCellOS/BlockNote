import { ReactNode } from "react";

import { HyperlinkToolbarProps } from "../HyperlinkToolbarProps";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { EditHyperlinkButton } from "./DefaultButtons/EditHyperlinkButton";
import { OpenHyperlinkButton } from "./DefaultButtons/OpenHyperlinkButton";
import { DeleteHyperlinkButton } from "./DefaultButtons/DeleteHyperlinkButton";

/**
 * By default, the HyperlinkToolbar component will render with default buttons.
 * However, you can override the selects/buttons to render by passing
 * children. The children you pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
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
      <EditHyperlinkButton
        url={props.url}
        text={props.text}
        editHyperlink={props.editHyperlink}
      />
      <OpenHyperlinkButton url={props.url} />
      <DeleteHyperlinkButton deleteHyperlink={props.deleteHyperlink} />
    </Toolbar>
  );
};
