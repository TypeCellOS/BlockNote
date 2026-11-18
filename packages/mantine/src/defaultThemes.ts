import type { Theme } from "./Theme.js";

// Defaults must provide every theme variable; element variables derive from them in CSS.
type DefaultTheme = {
  [Group in Exclude<keyof Theme, "elements">]-?: Required<
    NonNullable<Theme[Group]>
  >;
};

export const lightDefaultTheme = {
  textColor: {
    placeholder: "oklch(51.4% 0 0)",
    primary: "oklch(37% 0 0)",
    menu: "oklch(37% 0 0)",
    tooltip: "oklch(37% 0 0)",
    hovered: "oklch(37% 0 0)",
    selected: "oklch(100% 0 0)",
    disabled: "oklch(75% 0 0)",
    muted: "oklch(85% 0 0)",
    gray: "oklch(51.4% 0 0)",
    brown: "oklch(48.5% 0.06 50)",
    red: "oklch(50.5% 0.11 35)",
    orange: "oklch(50.5% 0.11 65)",
    yellow: "oklch(50.5% 0.11 95)",
    green: "oklch(50.5% 0.11 135)",
    blue: "oklch(50.5% 0.11 235)",
    purple: "oklch(50.5% 0.11 300)",
    pink: "oklch(50.5% 0.11 345)",
    secondary: "oklch(51.4% 0 0)",
  },
  backgroundColor: {
    muted: "oklch(93% 0 0)",
    editor: "oklch(100% 0 0)",
    menu: "oklch(100% 0 0)",
    tooltip: "oklch(95% 0 0)",
    hovered: "oklch(95% 0 0)",
    selected: "oklch(37% 0 0)",
    disabled: "oklch(95% 0 0)",
    gray: "oklch(93% 0 0)",
    brown: "oklch(93% 0.015 50)",
    red: "oklch(93% 0.04 35)",
    orange: "oklch(93% 0.04 65)",
    yellow: "oklch(93% 0.04 95)",
    green: "oklch(93% 0.04 135)",
    blue: "oklch(93% 0.04 235)",
    purple: "oklch(93% 0.04 300)",
    pink: "oklch(93% 0.04 345)",
  },
  border: {
    color: "oklch(95% 0 0)",
    colorStrong: "oklch(85% 0 0)",
  },
  focusRing: {
    color: "oklch(85% 0 0)",
  },
  fontFamily: {
    default:
      '"Inter", "Inter fallback", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  radius: {
    small: "4px",
    medium: "6px",
    large: "8px",
  },
  shadow: {
    default: "0 4px 12px oklch(85% 0 0)",
    subtle: "0 2px 6px oklch(95% 0 0)",
  },
  success: {
    background: "oklch(93% 0.04 135)",
    color: "oklch(50.5% 0.11 135)",
  },
  warning: {
    color: "oklch(50.5% 0.11 95)",
  },
  accent: {
    color: "oklch(50.5% 0.11 235)",
  },
  error: {
    color: "oklch(50.5% 0.11 35)",
    background: "oklch(93% 0.04 35)",
  },
} satisfies DefaultTheme;

export const darkDefaultTheme = {
  textColor: {
    placeholder: "oklch(85% 0 0)",
    primary: "oklch(85% 0 0)",
    menu: "oklch(85% 0 0)",
    tooltip: "oklch(85% 0 0)",
    hovered: "oklch(85% 0 0)",
    selected: "oklch(85% 0 0)",
    disabled: "oklch(37% 0 0)",
    muted: "oklch(60% 0 0)",
    gray: "oklch(71.5% 0 0)",
    brown: "oklch(73% 0.06 50)",
    red: "oklch(75% 0.1 35)",
    orange: "oklch(75% 0.1 65)",
    yellow: "oklch(75% 0.1 95)",
    green: "oklch(75% 0.1 135)",
    blue: "oklch(75% 0.1 235)",
    purple: "oklch(75% 0.1 300)",
    pink: "oklch(75% 0.1 345)",
    secondary: "oklch(71.5% 0 0)",
  },
  backgroundColor: {
    muted: "oklch(34% 0 0)",
    editor: "oklch(24% 0 0)",
    menu: "oklch(24% 0 0)",
    tooltip: "oklch(20% 0 0)",
    hovered: "oklch(20% 0 0)",
    selected: "oklch(17% 0 0)",
    disabled: "oklch(20% 0 0)",
    gray: "oklch(34% 0 0)",
    brown: "oklch(34% 0.035 50)",
    red: "oklch(34% 0.08 35)",
    orange: "oklch(34% 0.08 65)",
    yellow: "oklch(34% 0.08 95)",
    green: "oklch(34% 0.08 135)",
    blue: "oklch(34% 0.08 235)",
    purple: "oklch(34% 0.08 300)",
    pink: "oklch(34% 0.08 345)",
  },
  border: {
    color: "oklch(20% 0 0)",
    colorStrong: "oklch(60% 0 0)",
  },
  focusRing: {
    color: "oklch(60% 0 0)",
  },
  fontFamily: {
    default:
      '"Inter", "Inter fallback", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  },
  radius: {
    small: "4px",
    medium: "6px",
    large: "8px",
  },
  shadow: {
    default: "0 4px 12px oklch(17% 0 0)",
    subtle: "0 2px 6px oklch(20% 0 0)",
  },
  success: {
    background: "oklch(34% 0.08 135)",
    color: "oklch(75% 0.1 135)",
  },
  warning: {
    color: "oklch(75% 0.1 95)",
  },
  accent: {
    color: "oklch(75% 0.1 235)",
  },
  error: {
    color: "oklch(75% 0.1 35)",
    background: "oklch(34% 0.08 35)",
  },
} satisfies DefaultTheme;
