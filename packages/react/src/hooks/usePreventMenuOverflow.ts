import { useRef } from "react";

// This hook is used to stop Mantine Menu.Dropdown components from extending
// beyond the viewport. It does this by dynamically setting the max height of
// the dropdown. To use it, set the ref on a Menu.Dropdown's parent div, and
// call updateMaxHeight() in the Menu's `onOpen` listener. Unfortunately, this
// may mean you have to create an additional parent div, but you cannot set the
// ref on the Menu or Menu.Dropdown components directly so this is a necessary
// workaround.
export function usePreventMenuOverflow() {
  const ref = useRef<HTMLDivElement>(null);

  return {
    ref: ref,
    updateMaxHeight: () => {
      // Seems a small delay is necessary to get the correct DOM rect - likely
      // because the menu is not yet fully rendered when the `onOpen` event is
      // fired.
      setTimeout(() => {
        if (!ref.current) {
          return;
        }

        if (ref.current.childElementCount > 0) {
          // Reset any previously set max-height
          (ref.current.firstElementChild as HTMLDivElement).style.maxHeight =
            "none";

          // Get the menu DOM rect
          const domRect =
            ref.current.firstElementChild!.getBoundingClientRect();

          // Set the menu max height, based on the Tippy position. Checking if
          // the top of the menu is above the viewport (position < 0) is a quick
          // way to check if the placement is "top" or "bottom".
          (
            ref.current.firstElementChild as HTMLDivElement
          ).style.maxHeight = `${Math.min(
            domRect.top >= 0
              ? window.innerHeight - domRect.top - 20
              : domRect.bottom - 20
          )}px`;
        }
      }, 10);
    },
  };
}
