export const isAppleOS = () =>
  typeof navigator !== "undefined" &&
  (/Mac/.test(navigator.platform) ||
    (/AppleWebKit/.test(navigator.userAgent) &&
      /Mobile\/\w+/.test(navigator.userAgent)));

export function formatKeyboardShortcut(shortcut: string, ctrlText = "Ctrl") {
  if (isAppleOS()) {
    return shortcut.replace("Mod", "⌘");
  } else {
    return shortcut.replace("Mod", ctrlText);
  }
}

export function mergeCSSClasses(...classes: (string | false | undefined)[]) {
  return [
    // Converts to & from set to remove duplicates.
    ...new Set(
      classes
        .filter((c) => c)
        // Ensures that if multiple classes are passed as a single string, they
        // are split.
        .join(" ")
        .split(" "),
    ),
  ].join(" ");
}

export const isSafari = () =>
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

// Cached lazily on first call in a browser environment. Touch capability
// doesn't change during a session, so there's no need to re-run `matchMedia` on
// every call. We only cache once `navigator`/`window` are available, so a
// `false` computed during SSR isn't frozen and carried onto the client.
let isTouchDeviceCache: boolean | undefined;

export const isTouchDevice = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  if (isTouchDeviceCache === undefined) {
    isTouchDeviceCache =
      navigator.maxTouchPoints > 0 &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
  }

  return isTouchDeviceCache;
};
