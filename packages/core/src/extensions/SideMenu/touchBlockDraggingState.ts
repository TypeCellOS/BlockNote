/** Pure policy: geometry and keyboard observations, independent of DOM/events. */
export type Keyboard = {
  type: "unseen" | "visible";
  height: number;
  width: number;
};

// A 60px activation band leaves the middle of short containers neutral.
// Ramp to 840 CSS px/second so speed is independent of display refresh rate.
const scrollEdge = 60;
const scrollSpeed = 840;

export function edgeScrollSpeed(y: number, top: number, bottom: number) {
  const edge = Math.min(scrollEdge, Math.max(0, bottom - top) / 3);
  if (!edge) {
    return 0;
  }
  const distance =
    y < top + edge ? y - top - edge : y > bottom - edge ? y - bottom + edge : 0;
  return scrollSpeed * Math.max(-1, Math.min(1, distance / edge));
}

/** Undefined means the observed keyboard closed; unrelated resizes keep state. */
export function keyboardAfterResize(
  keyboard: Keyboard,
  viewport: { height: number; layoutWidth: number; scale: number },
): Keyboard | undefined {
  // Use the toolbar's viewport policy, but only end editing after this editing
  // session has observed an open keyboard. Never blur in response to pinch zoom.
  if (Math.abs(viewport.scale - 1) > 0.01) {
    return keyboard;
  }
  const next = observeVirtualKeyboard(
    { ...keyboard, open: keyboard.type === "visible" },
    viewport,
  );
  // Rotation starts a fresh observation, not a keyboard-dismissal action.
  if (next.width !== keyboard.width) {
    return { type: "unseen", height: next.height, width: next.width };
  }
  if (keyboard.type === "visible" && !next.open) {
    return undefined;
  }
  return {
    type: next.open ? "visible" : keyboard.type,
    height: next.height,
    width: next.width,
  };
}
import { observeVirtualKeyboard } from "../../util/virtualKeyboard.js";
