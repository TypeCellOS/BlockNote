import { Loader, Menu } from "@mantine/core";
import { Children, ReactNode } from "react";

export type SuggestionMenuProps = {
  loadingState?: "initial" | "loading-initial" | "loading" | "loaded";
  children?: ReactNode;
};

export function SuggestionMenu(props: SuggestionMenuProps) {
  const loader =
    props.loadingState === "loading-initial" ||
    props.loadingState === "loading" ? (
      <Loader className={"bn-slash-menu-loader"} type="dots" />
    ) : null;

  return (
    <Menu
      withinPortal={false}
      trapFocus={false}
      /** Hacky fix to get the desired menu behaviour. The trigger="hover"
       * attribute allows focus to remain on the editor, allowing for suggestion
       * filtering. The closeDelay=10000000 attribute allows the menu to stay open
       * practically indefinitely, as normally hovering off it would cause it to
       * close due to trigger="hover".
       */
      defaultOpened={true}
      trigger={"hover"}
      closeDelay={10000000}>
      <Menu.Dropdown
        onMouseDown={(event) => event.preventDefault()}
        className={"bn-slash-menu"}>
        {props.children}
        {Children.count(props.children) === 0 &&
          (props.loadingState === "loading" ||
            props.loadingState === "loaded") && (
            <Menu.Item>No match found</Menu.Item>
          )}
        {loader}
      </Menu.Dropdown>
    </Menu>
  );
}
