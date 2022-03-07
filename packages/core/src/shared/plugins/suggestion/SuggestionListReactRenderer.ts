import { Editor as ReactEditor, ReactRenderer } from "@tiptap/react";
import { Editor } from "@tiptap/core";
import tippy, { Instance } from "tippy.js";
import SuggestionItem from "./SuggestionItem";
import { SuggestionList, SuggestionListProps } from "./SuggestionList";

/**
 * The interface that each suggestion renderer should conform to.
 */
export interface SuggestionRenderer<T extends SuggestionItem> {
  /**
   * Disposes of the suggestion menu.
   */
  onExit?: (props: SuggestionRendererProps<T>) => void;

  /**
   * Updates the suggestion menu.
   *
   * This function should be called when the renderer's `props` change,
   * after `onStart` has been called.
   */
  onUpdate?: (props: SuggestionRendererProps<T>) => void;

  /**
   * Creates and displays a new suggestion menu popup.
   */
  onStart?: (props: SuggestionRendererProps<T>) => void;

  /**
   * Function for handling key events
   */
  onKeyDown?: (event: KeyboardEvent) => boolean;

  /**
   * The DOM Element representing the suggestion menu
   */
  getComponent: () => Element | undefined;
}

export type SuggestionRendererProps<T extends SuggestionItem> = {
  /**
   * Object containing all suggestion items, grouped by their `groupName`.
   */
  groups: {
    [groupName: string]: T[];
  };

  /**
   * The total number of suggestion-items.
   */
  count: number;

  /**
   * This callback is executed whenever the user selects an item.
   *
   * @param item the selected item
   */
  onSelectItem: (item: T) => void;

  /**
   * A function returning the client rect to use as reference for positioning the suggestion menu popup.
   */
  clientRect: (() => DOMRect) | null;

  /**
   * This callback is executed when the suggestion menu needs to be closed,
   * e.g. when the user presses escape.
   */
  onClose: () => void;
};

// If we do major work on this, consider exploring a cleaner approach: https://github.com/YousefED/typecell-next/issues/59
/**
 * This function creates a SuggestionRenderer based on TipTap's ReactRenderer utility.
 *
 * The resulting renderer can be used to display a suggestion menu containing (grouped) suggestion items.
 *
 * This renderer also takes care of the following key events:
 * - Key up/down, for navigating the suggestion menu (selecting different items)
 * - Enter for picking the currently selected item and closing the menu
 * - Escape to close the menu, without taking action
 *
 * @param editor the TipTap editor
 * @returns the newly constructed SuggestionRenderer
 */
export default function createRenderer<T extends SuggestionItem>(
  editor: Editor
): SuggestionRenderer<T> {
  let component: ReactRenderer;
  let popup: Instance[];
  let componentsDisposedOrDisposing = true;
  let selectedIndex = 0;
  let props: SuggestionRendererProps<T> | undefined;

  /**
   * Helper function to find out what item corresponds to a certain index.
   *
   * This function might throw an error if the index is invalid,
   * or when this function is not called in the proper environment.
   *
   * @param index the index
   * @returns the item that corresponds to the index
   */
  const itemByIndex = (index: number): T => {
    if (!props) {
      throw new Error("props not set");
    }
    let currentIndex = 0;
    for (const groupName in props.groups) {
      const items = props.groups[groupName];
      const groupSize = items.length;
      // Check if index lies within this group
      if (index < currentIndex + groupSize) {
        return items[index - currentIndex];
      }
      currentIndex += groupSize;
    }
    throw Error("item not found");
  };

  return {
    getComponent: () => {
      if (!popup || !popup[0]) return undefined;
      // return the tippy container element, this is used to ensure
      // that click events inside the menu are handled properly.
      return popup[0].reference;
    },
    onStart: (newProps) => {
      props = newProps;
      componentsDisposedOrDisposing = false;
      selectedIndex = 0;
      const componentProps: SuggestionListProps<T> = {
        groups: newProps.groups,
        count: newProps.count,
        onSelectItem: newProps.onSelectItem,
        selectedIndex,
      };

      component = new ReactRenderer(SuggestionList as any, {
        editor: editor as ReactEditor,
        props: componentProps,
      });

      popup = tippy("body", {
        getReferenceClientRect: newProps.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },

    onUpdate: (newProps) => {
      props = newProps;
      if (props.groups !== component.props.groups) {
        // if the set of items is different (e.g.: by typing / searching), reset the selectedIndex to 0
        selectedIndex = 0;
      }
      const componentProps: SuggestionListProps<T> = {
        groups: props.groups,
        count: props.count,
        onSelectItem: props.onSelectItem,
        selectedIndex,
      };
      component.updateProps(componentProps);

      popup[0].setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown: (event) => {
      if (!props) {
        return false;
      }
      if (event.key === "ArrowUp") {
        selectedIndex = (selectedIndex + props.count - 1) % props.count;
        component.updateProps({
          selectedIndex,
        });
        return true;
      }

      if (event.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % props.count;
        component.updateProps({
          selectedIndex,
        });
        return true;
      }

      if (event.key === "Enter") {
        const item = itemByIndex(selectedIndex);
        props.onSelectItem(item);
        return true;
      }

      if (event.key === "Escape") {
        props.onClose();
        return true;
      }
      return false;
    },

    onExit: (props) => {
      if (componentsDisposedOrDisposing) {
        return;
      }
      // onExit, first hide tippy popup so it shows fade-out
      // then (after 1 second, actually destroy resources)
      componentsDisposedOrDisposing = true;
      const popupToDestroy = popup[0];
      const componentToDestroy = component;
      popupToDestroy.hide();
      setTimeout(() => {
        popupToDestroy.destroy();
        componentToDestroy.destroy();
      }, 1000);
    },
  };
}
