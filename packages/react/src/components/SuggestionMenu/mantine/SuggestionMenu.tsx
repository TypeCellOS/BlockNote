import * as Ariakit from "@ariakit/react";
import { useCombobox } from "@ariakit/react-core/combobox/combobox";
import { useEffect, useMemo } from "react";

import { Loader, Stack, Text } from "@mantine/core";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "../types";

function FakeTarget(props: {}) {
  const members = [
    "key",
    "code",
    "location",
    "ctrlKey",
    "shiftKey",
    "altKey",
    "metaKey",
    "repeat",
    "isComposing",
    "charCode",
    "keyCode",
    "DOM_KEY_LOCATION_STANDARD",
    "DOM_KEY_LOCATION_LEFT",
    "DOM_KEY_LOCATION_RIGHT",
    "DOM_KEY_LOCATION_NUMPAD",
    "getModifierState",
    "initKeyboardEvent",
  ];

  const editor = useBlockNoteEditor();

  const cbprops = useCombobox({
    showOnClick: false,
    showOnChange: false,
    showOnKeyPress: false,
  });

  const { onKeyDown, onKeyDownCapture } = cbprops;
  console.log(cbprops);

  useEffect(() => {
    if (!editor.domElement) {
      return;
    }

    const listenerCapture = (event: KeyboardEvent) => {
      const e: any = {};
      for (const member of members) {
        e[member] = (event as any)[member];
      }
      e.currentTarget = event.currentTarget;
      e.target = event.target;
      e.nativeEvent = event;
      e.preventDefault = event.preventDefault.bind(event);
      e.isPropagationStopped = () => false;

      onKeyDownCapture?.(e);
    };

    const listener = (event: KeyboardEvent) => {
      const e: any = {};
      for (const member of members) {
        e[member] = (event as any)[member];
      }
      e.currentTarget = event.currentTarget;
      e.target = event.target;
      e.nativeEvent = event;
      e.preventDefault = event.preventDefault.bind(event);
      e.isPropagationStopped = () => false;
      onKeyDown?.(e);
    };

    editor.domElement.addEventListener("keydown", listenerCapture, true);
    editor.domElement.addEventListener("keydown", listener);

    return () => {
      editor.domElement.removeEventListener("keydown", listenerCapture, true);
      editor.domElement.removeEventListener("keydown", listener);
    };
  }, [onKeyDown, onKeyDownCapture, editor.domElement]);

  useEffect(() => {
    (cbprops.ref as any)?.(editor.domElement);
  }, [cbprops.ref, editor.domElement]);
  return null;
}

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  // const combobox = Ariakit.useComboboxStore({
  //   open: true,

  //   // virtualFocus: true,
  //   defaultActiveId: undefined,
  // });
  const editor = useBlockNoteEditor();

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

  // useEffect(() => {
  //   if (!editor.domElement) {
  //     return;
  //   }
  //   console.log(editor.domElement);
  //   hydrateRoot(
  //     editor.domElement,
  //     <Ariakit.Combobox
  //       render={
  //         <div
  //           className="bn-container ProseMirror bn-editor bn-default-styles"
  //           data-color-scheme="light"
  //           contentEditable="true"
  //           tabIndex="0"
  //           translate="no">
  //           <div className="bn-block-group" data-node-type="blockGroup">
  //             <div className="bn-block-outer" data-node-type="blockOuter">
  //               <div className="bn-block" data-node-type="blockContainer">
  //                 <div
  //                   className="bn-block-content"
  //                   data-content-type="paragraph"
  //                   data-is-empty-and-focused="true">
  //                   <p className="bn-inline-content">
  //                     <br className="ProseMirror-trailingBreak" />
  //                   </p>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       }
  //       store={combobox}
  //     />
  //   );
  // }, [editor.domElement]);
  /* <FakeTarget /> 
       <Ariakit.Combobox
        // We'll overwrite how the combobox popover is shown, so we disable
        // the default behaviors.
        showOnClick={false}
        showOnChange={false}
        showOnKeyPress={false}
        // To the combobox state, we'll only set the value after the trigger
        // character (the search value), so we disable the default behavior.
        // setValueOnChange={false}
        width={400}
        // position="bottom-start"
        // onOptionSubmit={(item) => {
        //   if (item) {
        //     props.onItemClick?.(items.find((i) => i.title === item)!);
        //     props.closeMenu();
        //   }
        // }}
        // keepMounted={false}
      /> */
  return (
    <Ariakit.ComboboxPopover
      // autoFocusOnShow
      // store={combobox}
      getAnchorRect={() => ({
        x: props.referencePos.left,
        y: props.referencePos.top,
      })}>
      <Ariakit.ComboboxItem className="bn-combobox-item">
        dropdownitem
      </Ariakit.ComboboxItem>
      <Ariakit.ComboboxItem className="bn-combobox-item">
        dropdownitem
      </Ariakit.ComboboxItem>
      {/* <FakeTarget /> */}
      {/* {options}
      {Children.count(options) === 0 &&
        (props.loadingState === "loading" ||
          props.loadingState === "loaded") && (
          <div>empty</div>
          // </><Combobox.Empty>No match found</Combobox.Empty>
        )}
      {loader} */}
    </Ariakit.ComboboxPopover>
    // </Ariakit.ComboboxProvider>
    // </Ariakit.Combobox>
  );
}
