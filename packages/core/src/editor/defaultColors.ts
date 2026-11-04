// sRGB equivalents of the light/dark --bn-colors-highlights-* palettes in
// packages/react/src/editor/styles.css (also used by Block.css highlight rules).
export const COLORS_DEFAULT = {
  gray: {
    text: "#676767",
    background: "#e8e8e8",
  },
  brown: {
    text: "#7b5540",
    background: "#f1e5df",
  },
  red: {
    text: "#994a37",
    background: "#ffdfd6",
  },
  orange: {
    text: "#8f5509",
    background: "#fbe3cd",
  },
  yellow: {
    text: "#796300",
    background: "#f0e8cb",
  },
  green: {
    text: "#48722d",
    background: "#ddeed4",
  },
  blue: {
    text: "#006d9a",
    background: "#cfedff",
  },
  purple: {
    text: "#6f549a",
    background: "#ece2ff",
  },
  pink: {
    text: "#904873",
    background: "#fddeee",
  },
} as Record<string, { text: string; background: string }>;

export const COLORS_DARK_MODE_DEFAULT = {
  gray: {
    text: "#a3a3a3",
    background: "#383838",
  },
  brown: {
    text: "#c79d86",
    background: "#473328",
  },
  red: {
    text: "#e69783",
    background: "#5a2619",
  },
  orange: {
    text: "#daa168",
    background: "#532d00",
  },
  yellow: {
    text: "#c2ad61",
    background: "#453700",
  },
  green: {
    text: "#92bc7c",
    background: "#254112",
  },
  blue: {
    text: "#6ab8e4",
    background: "#003d5b",
  },
  purple: {
    text: "#b7a0e4",
    background: "#3f2d5b",
  },
  pink: {
    text: "#dc94bc",
    background: "#542541",
  },
} as Record<string, { text: string; background: string }>;
