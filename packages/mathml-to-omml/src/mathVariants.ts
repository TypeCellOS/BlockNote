/**
 * Translates MathML `mathvariant` attributes to their OMML equivalents.
 *
 * OMML has no `mathvariant`. Bold/italic/plain map onto the run style
 * (`m:sty`); the remaining alphabets (double-struck, script, fraktur,
 * sans-serif, monospace) only exist in OMML as the Unicode Mathematical
 * Alphanumeric Symbols (U+1D400–U+1D7FF), so those are remapped per
 * character. Letters that predate that block live in Letterlike Symbols
 * (U+2100–U+214F) and are handled via exception tables — e.g. ℝ, ℂ, ℋ, ℜ.
 */

export type OmmlRunStyle = "p" | "b" | "bi";

interface VariantTable {
  upper: number;
  lower: number;
  digit?: number;
  exceptions?: Record<string, string>;
}

const VARIANTS: Record<string, VariantTable> = {
  "double-struck": {
    upper: 0x1d538,
    lower: 0x1d552,
    digit: 0x1d7d8,
    exceptions: {
      C: "ℂ",
      H: "ℍ",
      N: "ℕ",
      P: "ℙ",
      Q: "ℚ",
      R: "ℝ",
      Z: "ℤ",
    },
  },
  script: {
    upper: 0x1d49c,
    lower: 0x1d4b6,
    exceptions: {
      B: "ℬ",
      E: "ℰ",
      F: "ℱ",
      H: "ℋ",
      I: "ℐ",
      L: "ℒ",
      M: "ℳ",
      R: "ℛ",
      e: "ℯ",
      g: "ℊ",
      o: "ℴ",
    },
  },
  "bold-script": { upper: 0x1d4d0, lower: 0x1d4ea },
  fraktur: {
    upper: 0x1d504,
    lower: 0x1d51e,
    exceptions: { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" },
  },
  "bold-fraktur": { upper: 0x1d56c, lower: 0x1d586 },
  "sans-serif": { upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
  monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};

const remapCharacter = (char: string, table: VariantTable): string => {
  const exception = table.exceptions?.[char];
  if (exception) {
    return exception;
  }
  const code = char.codePointAt(0)!;
  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCodePoint(table.upper + (code - 0x41));
  }
  if (code >= 0x61 && code <= 0x7a) {
    return String.fromCodePoint(table.lower + (code - 0x61));
  }
  if (table.digit !== undefined && code >= 0x30 && code <= 0x39) {
    return String.fromCodePoint(table.digit + (code - 0x30));
  }
  return char;
};

export interface VariantResult {
  text: string;
  style?: OmmlRunStyle;
}

export function applyMathVariant(
  text: string,
  variant: string | undefined,
): VariantResult {
  // Letters in math default to italic in both MathML and OMML, so "italic"
  // needs no marker.
  if (variant === undefined || variant === "italic") {
    return { text };
  }
  switch (variant) {
    case "normal":
      return { text, style: "p" };
    case "bold":
      return { text, style: "b" };
    case "bold-italic":
      return { text, style: "bi" };
  }
  const table = VARIANTS[variant];
  if (!table) {
    // Unknown/unsupported variant: keep the characters unchanged.
    return { text };
  }
  return {
    text: Array.from(text)
      .map((char) => remapCharacter(char, table))
      .join(""),
  };
}
