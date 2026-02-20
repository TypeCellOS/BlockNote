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
export const LinkToolbar = (props: LinkToolbarProps) => {
  const Components = useComponentsContext()!;

  return (
    <Components.LinkToolbar.Root className={"bn-toolbar bn-link-toolbar"}>
      {props.children || (
        <>
          <EditLinkButton
            url={props.url}
            text={props.text}
            range={props.range}
            setToolbarOpen={props.setToolbarOpen}
            setToolbarPositionFrozen={props.setToolbarPositionFrozen}
          />
          <OpenLinkButton url={props.url} />
          <DeleteLinkButton
            range={props.range}
            setToolbarOpen={props.setToolbarOpen}
          />
        </>
      )}
    </Components.LinkToolbar.Root>
  );
};
