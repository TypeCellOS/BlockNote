import * as React from "react";
import { isElement } from "@floating-ui/utils/dom";
import {
  isMouseLikePointerType,
  useLatestRef,
  useEffectEvent,
  useModernLayoutEffect,
} from "@floating-ui/react/utils";
import type {
  Delay,
  ElementProps,
  FloatingContext,
  OpenChangeReason,
} from "@floating-ui/react";

function clearTimeoutIfSet(timeoutRef: React.RefObject<number>) {
  if (timeoutRef.current !== -1) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = -1;
  }
}

export interface UseElementHoverProps<T = HTMLElement> {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: Delay | (() => Delay);
  /**
   * Waits until the user's cursor is at "rest" over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: number | (() => number);
  /**
   * Whether the logic only runs for mouse input, ignoring touch input.
   * Note: due to a bug with Linux Chrome, "pen" inputs are considered "mouse".
   * @default false
   */
  mouseOnly?: boolean;
  /**
   * The element to attach mouse event listeners to.
   */
  attachTo: () => HTMLElement;
  /**
   * Function to get the element at the hover position. Returns null to disable hover.
   */
  getElementAtHover: (target: EventTarget) => T | null;
  /**
   * Callback when an element is hovered.
   */
  onHover?: (element: T | null) => void;
}

function getDelay(
  value: UseElementHoverProps["delay"],
  prop: "open" | "close",
  pointerType?: PointerEvent["pointerType"],
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "function") {
    const result = value();
    if (typeof result === "number") {
      return result;
    }
    return result?.[prop];
  }
  return value?.[prop];
}

function getRestMs(value: number | (() => number)) {
  if (typeof value === "function") {
    return value();
  }
  return value;
}

/**
 * Opens the floating element while hovering over elements detected by getElementAtHover.
 * Similar to CSS `:hover` but with configurable delays and rest behavior.
 */
export function useElementHover<T = HTMLElement>(
  context: FloatingContext,
  props: UseElementHoverProps<T>,
): ElementProps {
  const { open, onOpenChange, dataRef, events, elements } = context;
  const {
    attachTo,
    enabled = true,
    delay = 0,
    mouseOnly = false,
    restMs = 0,
    getElementAtHover,
    onHover,
  } = props;

  const delayRef = useLatestRef(delay);
  const openRef = useLatestRef(open);
  const restMsRef = useLatestRef(restMs);
  const getElementAtHoverRef = useLatestRef(getElementAtHover);
  const onHoverRef = useLatestRef(onHover);

  const pointerTypeRef = React.useRef<PointerEvent["pointerType"]>(undefined);
  const timeoutRef = React.useRef(-1);
  const restTimeoutRef = React.useRef(-1);
  const blockMouseMoveRef = React.useRef(true);
  const restTimeoutPendingRef = React.useRef(false);
  const currentHoveredElementRef = React.useRef<T | null>(null);

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    function onOpenChange({ open }: { open: boolean }) {
      if (!open) {
        clearTimeoutIfSet(timeoutRef);
        clearTimeoutIfSet(restTimeoutRef);
        blockMouseMoveRef.current = true;
        restTimeoutPendingRef.current = false;
        currentHoveredElementRef.current = null;
      }
    }

    events.on("openchange", onOpenChange);
    return () => {
      events.off("openchange", onOpenChange);
    };
  }, [enabled, events]);

  const closeWithDelay = React.useCallback(
    (
      event: Event,
      runElseBranch = true,
      reason: OpenChangeReason = "hover",
    ) => {
      const closeDelay = getDelay(
        delayRef.current,
        "close",
        pointerTypeRef.current,
      );
      if (closeDelay && runElseBranch) {
        clearTimeoutIfSet(timeoutRef);
        timeoutRef.current = window.setTimeout(
          () => onOpenChange(false, event, reason),
          closeDelay,
        );
      } else if (runElseBranch) {
        clearTimeoutIfSet(timeoutRef);
        onOpenChange(false, event, reason);
      }
    },
    [delayRef, onOpenChange],
  );

  const isClickLikeOpenEvent = useEffectEvent(() => {
    return dataRef.current.openEvent
      ? ["click", "mousedown"].includes(dataRef.current.openEvent.type)
      : false;
  });

  // Registering the mouse events on the attachTo element
  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    function onMouseEnter(event: MouseEvent) {
      clearTimeoutIfSet(timeoutRef);
      blockMouseMoveRef.current = false;

      const element = getElementAtHoverRef.current(event.target as EventTarget);

      // If no element found, don't open
      if (!element) {
        currentHoveredElementRef.current = null;
        onHoverRef.current?.(null);
        return;
      }

      // If same element, don't reopen
      if (currentHoveredElementRef.current === element) {
        return;
      }

      currentHoveredElementRef.current = element;
      onHoverRef.current?.(element);

      if (
        (mouseOnly && !isMouseLikePointerType(pointerTypeRef.current)) ||
        (getRestMs(restMsRef.current) > 0 &&
          !getDelay(delayRef.current, "open"))
      ) {
        return;
      }

      const openDelay = getDelay(
        delayRef.current,
        "open",
        pointerTypeRef.current,
      );

      if (openDelay) {
        timeoutRef.current = window.setTimeout(() => {
          if (!openRef.current) {
            onOpenChange(true, event, "hover");
          }
        }, openDelay);
      } else if (!open) {
        onOpenChange(true, event, "hover");
      }
    }

    function onMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent()) {
        return;
      }

      clearTimeoutIfSet(restTimeoutRef);
      restTimeoutPendingRef.current = false;

      // Check if we're leaving the hovered element
      const element = getElementAtHoverRef.current(event.target as EventTarget);
      if (element === currentHoveredElementRef.current) {
        currentHoveredElementRef.current = null;
        onHoverRef.current?.(null);
        closeWithDelay(event);
      }
    }

    function onMouseMove(event: MouseEvent) {
      const element = getElementAtHoverRef.current(event.target as EventTarget);

      if (!element) {
        if (currentHoveredElementRef.current) {
          currentHoveredElementRef.current = null;
          onHoverRef.current?.(null);
          closeWithDelay(event);
        }
        return;
      }

      if (element === currentHoveredElementRef.current) {
        return;
      }

      // New element detected
      currentHoveredElementRef.current = element;
      onHoverRef.current?.(element);

      if (mouseOnly && !isMouseLikePointerType(pointerTypeRef.current)) {
        return;
      }

      if (open || getRestMs(restMsRef.current) === 0) {
        return;
      }

      // Ignore insignificant movements to account for tremors.
      if (
        restTimeoutPendingRef.current &&
        (event as MouseEvent).movementX ** 2 +
          (event as MouseEvent).movementY ** 2 <
          2
      ) {
        return;
      }

      clearTimeoutIfSet(restTimeoutRef);
      if (pointerTypeRef.current === "touch") {
        if (!openRef.current) {
          onOpenChange(true, event, "hover");
        }
      } else {
        restTimeoutPendingRef.current = true;
        restTimeoutRef.current = window.setTimeout(() => {
          if (!openRef.current) {
            onOpenChange(true, event, "hover");
          }
        }, getRestMs(restMsRef.current));
      }
    }

    function onFloatingMouseEnter() {
      clearTimeoutIfSet(timeoutRef);
    }

    function onFloatingMouseLeave(event: MouseEvent) {
      if (!isClickLikeOpenEvent()) {
        closeWithDelay(event, false);
      }
    }

    const el = attachTo();

    if (isElement(el)) {
      const floating = elements.floating;

      el.addEventListener("mouseenter", onMouseEnter);
      el.addEventListener("mouseleave", onMouseLeave);
      el.addEventListener("mousemove", onMouseMove);

      if (floating) {
        floating.addEventListener("mouseenter", onFloatingMouseEnter);
        floating.addEventListener("mouseleave", onFloatingMouseLeave);
      }

      return () => {
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
        el.removeEventListener("mousemove", onMouseMove);

        if (floating) {
          floating.removeEventListener("mouseenter", onFloatingMouseEnter);
          floating.removeEventListener("mouseleave", onFloatingMouseLeave);
        }
      };
    }

    return;
  }, [
    enabled,
    attachTo,
    elements,
    mouseOnly,
    closeWithDelay,
    onOpenChange,
    open,
    openRef,
    delayRef,
    restMsRef,
    getElementAtHoverRef,
    onHoverRef,
    dataRef,
    isClickLikeOpenEvent,
  ]);

  useModernLayoutEffect(() => {
    if (!open) {
      pointerTypeRef.current = undefined;
      restTimeoutPendingRef.current = false;
      currentHoveredElementRef.current = null;
    }
  }, [open]);

  React.useEffect(() => {
    return () => {
      clearTimeoutIfSet(timeoutRef);
      clearTimeoutIfSet(restTimeoutRef);
    };
  }, [enabled]);

  const reference: ElementProps["reference"] = React.useMemo(() => {
    function setPointerRef(event: React.PointerEvent) {
      pointerTypeRef.current = event.pointerType;
    }

    return {
      onPointerDown: setPointerRef,
      onPointerEnter: setPointerRef,
      onMouseMove(event) {
        const { nativeEvent } = event;

        function handleMouseMove() {
          if (!blockMouseMoveRef.current && !openRef.current) {
            const element = getElementAtHoverRef.current(
              nativeEvent.target as EventTarget,
            );
            if (element) {
              currentHoveredElementRef.current = element;
              onHoverRef.current?.(element);
              onOpenChange(true, nativeEvent, "hover");
            }
          }
        }

        if (mouseOnly && !isMouseLikePointerType(pointerTypeRef.current)) {
          return;
        }

        if (open || getRestMs(restMsRef.current) === 0) {
          return;
        }

        // Ignore insignificant movements to account for tremors.
        if (
          restTimeoutPendingRef.current &&
          event.movementX ** 2 + event.movementY ** 2 < 2
        ) {
          return;
        }

        clearTimeoutIfSet(restTimeoutRef);
        if (pointerTypeRef.current === "touch") {
          handleMouseMove();
        } else {
          restTimeoutPendingRef.current = true;
          restTimeoutRef.current = window.setTimeout(
            handleMouseMove,
            getRestMs(restMsRef.current),
          );
        }
      },
    };
  }, [
    mouseOnly,
    onOpenChange,
    open,
    openRef,
    restMsRef,
    getElementAtHoverRef,
    onHoverRef,
  ]);

  return React.useMemo(
    () => (enabled ? { reference } : {}),
    [enabled, reference],
  );
}
