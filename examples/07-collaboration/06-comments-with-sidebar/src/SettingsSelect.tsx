import {
  ComponentProps,
  useComponentsContext,
  usePortalElement,
} from "@blocknote/react";

// This component is used to display a selection dropdown with a label. By using
// the useComponentsContext hook, we can create it out of existing components
// within the same UI library that `BlockNoteView` uses (Mantine, Ariakit, or
// ShadCN), to match the design of the editor.
export const SettingsSelect = (props: {
  label: string;
  items: ComponentProps["FormattingToolbar"]["Select"]["items"];
}) => {
  const Components = useComponentsContext()!;
  // The select's dropdown portals into the editor's portal element, which keeps
  // it themed and clear of any overflow clipping. The prop is required, so it
  // can't be left out by accident.
  const portalElement = usePortalElement();

  return (
    <div className={"settings-select"}>
      <Components.Generic.Toolbar.Root className={"bn-toolbar"}>
        <h2>{props.label + ":"}</h2>
        <Components.Generic.Toolbar.Select
          className={"bn-select"}
          items={props.items}
          portalElement={portalElement}
        />
      </Components.Generic.Toolbar.Root>
    </div>
  );
};
