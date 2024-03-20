import {
  Combobox,
  Loader,
  Stack,
  Text,
  useCombobox,
  useComboboxTargetProps,
} from "@mantine/core";
import { Children, useEffect, useMemo } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "../types";

function FakeTarget(props: {}) {
  const editor = useBlockNoteEditor();

  const targetProps = useComboboxTargetProps({
    // targetType: ,
    withAriaAttributes: true,
    withKeyboardNavigation: true,
    withExpandedAttribute: true,
    targetType: undefined,
    onKeyDown: undefined,
  });

  const { onKeyDown } = targetProps;

  useEffect(() => {
    if (!editor.domElement) {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      const e: any = event;
      e.nativeEvent = event;
      onKeyDown(e);
    };

    editor.domElement.addEventListener("keydown", listener, true);

    return () => {
      editor.domElement.removeEventListener("keydown", listener, true);
    };
  }, [onKeyDown, editor.domElement]);

  return null;
}

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  const combobox = useCombobox({
    opened: props.opened,
    onDropdownClose: () => props.closeMenu(),
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
        <Combobox.Option
          value={item.title}
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
        </Combobox.Option>
      );
    }

    return options;
  }, [items, components]);

  return (
    <Combobox
      withinPortal={false}
      store={combobox}
      width={400}
      position="bottom-start"
      onOptionSubmit={(item) => {
        if (item) {
          props.onItemClick?.(items.find((i) => i.title === item)!);
          props.closeMenu();
        }
      }}
      keepMounted={false}>
      <Combobox.DropdownTarget>
        <div
          style={{
            position: "absolute",
            left: props.referencePos?.left,
            top: props.referencePos?.top,
          }}></div>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <FakeTarget />
        <Combobox.Options>
          {options}
          {Children.count(options) === 0 &&
            (props.loadingState === "loading" ||
              props.loadingState === "loaded") && (
              <Combobox.Empty>No match found</Combobox.Empty>
            )}
          {loader}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
