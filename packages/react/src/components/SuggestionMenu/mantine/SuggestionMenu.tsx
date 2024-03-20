import * as Ariakit from "@ariakit/react";
import { Children, useMemo } from "react";

import { Loader, Stack, Text } from "@mantine/core";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "../types";

// function FakeTarget(props: {}) {
//   const editor = useBlockNoteEditor();

//   const targetProps = useComboboxTargetProps({
//     // targetType: ,
//     withAriaAttributes: true,
//     withKeyboardNavigation: true,
//     withExpandedAttribute: true,
//     targetType: undefined,
//     onKeyDown: undefined,
//   });

//   const { onKeyDown } = targetProps;

//   useEffect(() => {
//     if (!editor.domElement) {
//       return;
//     }

//     const listener = (event: KeyboardEvent) => {
//       const e: any = event;
//       e.nativeEvent = event;
//       onKeyDown(e);
//     };

//     editor.domElement.addEventListener("keydown", listener, true);

//     return () => {
//       editor.domElement.removeEventListener("keydown", listener, true);
//     };
//   }, [onKeyDown, editor.domElement]);

//   return null;
// }

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  const combobox = Ariakit.useComboboxStore({
    open: props.opened,
    virtualFocus: true,
  });

  const components = useComponentsContext()!;
  const { items, loadingState } = props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Loader className={"bn-slash-menu-loader"} type="dots" />
    ) : null;

  const options = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const options = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        options.push(
          <components.MenuLabel key={currentGroup}>
            {currentGroup}
          </components.MenuLabel>
        );
      }

      options.push(
        <Ariakit.ComboboxItem
          className="bn-combobox-item"
          onClick={() => props.onItemClick?.(item)}
          value={item.title}
          focusOnHover
          // isSelected={i === selectedIndex}
          key={item.title}>
          {/* TODO */}
          {/* leftSection={props.icon} */}
          {/* rightSection={props.badge && <Badge size={"xs"}>{props.badge}</Badge>} */}
          <Stack>
            {/*Might need separate classes.*/}
            <Text lh={"20px"} size={"14px"} fw={500}>
              {item.title}
            </Text>
            <Text lh={"16px"} size={"10px"}>
              {item.subtext}
            </Text>
          </Stack>
        </Ariakit.ComboboxItem>
      );
    }

    return options;
  }, [items, components]);

  return (
    // <Ariakit.Combobox
    //   // We'll overwrite how the combobox popover is shown, so we disable
    //   // the default behaviors.
    //   showOnClick={false}
    //   showOnChange={false}
    //   showOnKeyPress={false}
    //   // To the combobox state, we'll only set the value after the trigger
    //   // character (the search value), so we disable the default behavior.
    //   setValueOnChange={false}
    //   store={combobox}
    //   width={400}
    //   // position="bottom-start"
    //   // onOptionSubmit={(item) => {
    //   //   if (item) {
    //   //     props.onItemClick?.(items.find((i) => i.title === item)!);
    //   //     props.closeMenu();
    //   //   }
    //   // }}
    //   // keepMounted={false}
    // >
    <Ariakit.ComboboxPopover
      autoFocusOnShow
      store={combobox}
      getAnchorRect={() => ({
        x: props.referencePos.left,
        y: props.referencePos.top,
      })}>
      {/* <FakeTarget /> */}
      {options}
      {Children.count(options) === 0 &&
        (props.loadingState === "loading" ||
          props.loadingState === "loaded") && (
          <div>empty</div>
          // </><Combobox.Empty>No match found</Combobox.Empty>
        )}
      {loader}
    </Ariakit.ComboboxPopover>
    // </Ariakit.Combobox>
  );
}
