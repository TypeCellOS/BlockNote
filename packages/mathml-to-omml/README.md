# @blocknote/mathml-to-omml

Converts [MathML](https://www.w3.org/TR/mathml-core/) to OMML (Office Math
Markup Language), the math format used in `.docx` documents.

The converter covers the MathML dialect that [KaTeX](https://katex.org/)
emits (`output: "mathml"`) as well as the wider presentation-MathML surface
that has an OMML representation. XML parsing is handled by
[`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser)
(MIT); the package runs in both browsers and Node.

This is a clean-room implementation written against the MathML Core /
MathML 3 specifications and ECMA-376 Part 1 §22.1 (Office Math), without
reference to other converter implementations.

## Usage

```ts
import { mathMLToOMML } from "@blocknote/mathml-to-omml";

const omml = mathMLToOMML(
  '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
);
// '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">…</m:oMath>'
```

The result is an `<m:oMath>` XML fragment ready to be embedded in a
WordprocessingML document (e.g. via `docx`'s `ImportedXmlComponent`).

Unsupported MathML constructs throw `UnsupportedMathMLError` (and malformed
XML throws `XmlParseError`), so callers can fall back to rendering the math
source instead of silently dropping content:

```ts
import {
  mathMLToOMML,
  UnsupportedMathMLError,
} from "@blocknote/mathml-to-omml";

try {
  return mathMLToOMML(mathml);
} catch (error) {
  // fall back to plain-text / source rendering
}
```

## Supported MathML

| MathML                                                       | OMML                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `mi`, `mn`, `mo`, `mtext`                                    | `m:r` runs (`m:nor` for text, `m:sty` for bold/plain, `w:rPr` for bold/italic text) |
| `ms`                                                         | quoted normal-text run (`lquote`/`rquote`)                                          |
| `mathvariant` alphabets (incl. inherited from `mstyle`)      | Unicode math alphanumerics (ℝ, 𝒜, 𝔤, 𝖠, 𝚡, …)                                       |
| `mfrac` (incl. `linethickness="0"`)                          | `m:f` (`noBar` for binomials)                                                       |
| `msqrt`, `mroot`                                             | `m:rad`                                                                             |
| `msub`, `msup`, `msubsup`                                    | `m:sSub`, `m:sSup`, `m:sSubSup`                                                     |
| `mmultiscripts` (incl. `mprescripts`, `none`)                | chained scripts + `m:sPre`                                                          |
| `munder`, `mover`, `munderover`                              | `m:limLow`, `m:limUpp`                                                              |
| big operators (`∑`, `∫`, …, and `largeop="true"`)            | `m:nary` with the operand nested inside                                             |
| fenced rows (`fence="true"`, incl. one-sided)                | `m:d`                                                                               |
| `mfenced` (deprecated, still emitted by some tools)          | `m:d` with `open`/`close`/`separators`                                              |
| accents (`\hat`, `\vec`, …, with or without `accent="true"`) | `m:acc` with combining characters                                                   |
| `\overline`, `\underline`                                    | `m:bar`                                                                             |
| `\overbrace`, `\underbrace`                                  | `m:groupChr` + limits                                                               |
| `mtable` / `mtr` / `mtd` with `columnalign`                  | `m:m` (matrix) with column alignment                                                |
| `menclose` (box, rounded box, side borders, strikes)         | `m:borderBox`                                                                       |
| `mphantom`                                                   | `m:phant`                                                                           |
| `mspace`, spacing text                                       | fixed-width space characters                                                        |
| `maction`                                                    | default rendering (first child)                                                     |
| `merror`                                                     | content without error styling                                                       |
| `semantics` / `annotation`                                   | presentation converted, annotations dropped                                         |
| `maligngroup` / `malignmark`                                 | dropped (no OMML equivalent)                                                        |

Constructs with no OMML representation — elementary-math layout
(`mlongdiv`, `mstack`, …) and `mglyph` — throw `UnsupportedMathMLError`.

## License

Mozilla Public License 2.0.
