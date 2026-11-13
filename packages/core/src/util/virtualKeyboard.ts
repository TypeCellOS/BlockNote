export type VirtualKeyboardState = {
  height: number;
  width: number;
  open: boolean;
};

/**
 * Shared viewport heuristic, not an OS keyboard signal. Scale-normalized height
 * excludes pinch zoom; a large layout-width change resets the orientation's
 * baseline. 150px separates browser chrome (~60–100px) from a keyboard (~250px+).
 */
export function observeVirtualKeyboard(
  previous: VirtualKeyboardState | undefined,
  viewport: { height: number; scale: number; layoutWidth: number },
): VirtualKeyboardState {
  const layoutHeight = viewport.height * viewport.scale;
  const sameOrientation =
    previous &&
    Math.abs(viewport.layoutWidth - previous.width) <= previous.width * 0.2;
  const height = Math.max(sameOrientation ? previous.height : 0, layoutHeight);
  return {
    height,
    width: sameOrientation ? previous.width : viewport.layoutWidth,
    open: height - layoutHeight > 150,
  };
}
