import { expect, test } from "vite-plus/test";
import { COLORS_DARK_MODE_DEFAULT, COLORS_DEFAULT } from "./defaultColors.js";

function luminance(hex: string) {
  // All exporters must be able to consume the shared palette, including those
  // that require RGB hex rather than CSS color functions.
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test.each([
  ["light", COLORS_DEFAULT],
  ["dark", COLORS_DARK_MODE_DEFAULT],
] as const)(
  "%s exporter palette preserves normal-text contrast",
  (_, palette) => {
    // Users can combine any named text color with any named background color.
    for (const [textName, text] of Object.entries(palette)) {
      for (const [backgroundName, background] of Object.entries(palette)) {
        const foreground = luminance(text.text);
        const backdrop = luminance(background.background);
        const ratio =
          (Math.max(foreground, backdrop) + 0.05) /
          (Math.min(foreground, backdrop) + 0.05);
        expect(
          ratio,
          `${textName} text on ${backgroundName}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  },
);
