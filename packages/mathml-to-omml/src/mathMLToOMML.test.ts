import katex from "katex";
import { describe, expect, it } from "vite-plus/test";
import xmlFormat from "xml-formatter";

import { mathMLToOMML, UnsupportedMathMLError } from "./convert.js";
import { XmlParseError } from "./xmlParser.js";

const latexToMathML = (latex: string, displayMode = false): string => {
  const html = katex.renderToString(latex, {
    displayMode,
    output: "mathml",
    throwOnError: true,
  });
  const mathml = html.match(/<math[\s\S]*<\/math>/)?.[0];
  if (!mathml) {
    throw new Error("No MathML found in KaTeX output");
  }
  return mathml;
};

const convertLatex = (latex: string, displayMode = false): string =>
  mathMLToOMML(latexToMathML(latex, displayMode));

/**
 * LaTeX constructs covering the MathML shapes KaTeX emits. Converted
 * through KaTeX → MathML → OMML and snapshotted.
 */
const SAMPLES: [name: string, latex: string, display: boolean][] = [
  ["fraction", "\\frac{a}{b}", true],
  ["binomial", "\\binom{n}{k}", true],
  ["square root", "a^2 = \\sqrt{b^2 + c^2}", true],
  ["nth root", "\\sqrt[3]{x}", true],
  ["subscript + superscript", "x_i^2", false],
  ["prime", "f'(x)", false],
  ["euler", "e^{i\\pi} + 1 = 0", false],
  ["sum with limits (display)", "\\sum_{i=1}^{n} i^2", true],
  ["sum with limits (inline)", "\\sum_{i=1}^{n} i^2", false],
  ["sum without limits", "\\sum x", true],
  ["sum standalone", "\\sum_{i=1}^{n}", true],
  ["sum followed by relation", "\\sum_{i} x = y", true],
  ["integral", "\\int_0^\\infty e^{-x} \\, dx", true],
  ["contour integral", "\\oint_C f", true],
  ["limit", "\\lim_{x \\to 0} \\frac{\\sin x}{x}", true],
  ["parentheses", "\\left( \\frac{a}{b} \\right)", true],
  ["evaluation bar", "\\left. \\frac{df}{dx} \\right|_{x=0}", true],
  ["angle brackets", "\\langle x, y \\rangle", false],
  ["matrix", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", true],
  [
    "cases",
    "\\begin{cases} x & x > 0 \\\\ 0 & \\text{else} \\end{cases}",
    true,
  ],
  ["aligned", "\\begin{aligned} a &= b + c \\\\ d &= e \\end{aligned}", true],
  ["hat", "\\hat{x}", false],
  ["vector arrow", "\\vec{v}", false],
  ["bar accent", "\\bar{y}", false],
  ["tilde", "\\tilde{a}", false],
  ["double dot", "\\ddot{x}", false],
  ["overline", "\\overline{AB}", false],
  ["underline", "\\underline{x}", false],
  ["overbrace", "\\overbrace{a+b}^{n}", true],
  ["underbrace", "\\underbrace{a+b}_{n}", true],
  ["math alphabets", "\\mathbb{R} \\mathcal{L} \\mathfrak{g}", false],
  ["bold", "\\mathbf{v} \\boldsymbol{\\alpha}", false],
  ["upright, sans, mono", "\\mathrm{d} \\mathsf{A} \\mathtt{x}", false],
  ["text", "\\text{hello world}", false],
  ["functions", "\\sin x + \\log_2 n", false],
  ["operatorname", "\\operatorname{tr}(A)", false],
  ["boxed", "\\boxed{E = mc^2}", true],
  ["cancel", "\\cancel{x}", false],
  ["symbols", "\\alpha + \\infty \\pm \\cdot", false],
  ["extensible arrow", "x \\xrightarrow{f} y", false],
  ["spacing", "a\\,b\\;c\\quad d", false],
  ["partial derivatives", "\\frac{\\partial f}{\\partial x}", true],
  ["phantom", "a + \\phantom{b} + c", false],
  ["overset", "X \\overset{!}{=} Y", false],
];

describe("mathMLToOMML", () => {
  it("converts the KaTeX sample battery", async () => {
    const rendered = SAMPLES.map(
      ([name, latex, display]) =>
        `===== ${name}: ${latex}\n${xmlFormat(convertLatex(latex, display))}`,
    ).join("\n\n");
    await expect(rendered).toMatchFileSnapshot(
      "__snapshots__/katexBattery.omml.txt",
    );
  });

  it("wraps output in an m:oMath root with the OMML namespace", () => {
    expect(convertLatex("x")).toBe(
      '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">' +
        "<m:r><m:t>x</m:t></m:r></m:oMath>",
    );
  });

  it("renders fractions with numerator and denominator", () => {
    const omml = convertLatex("\\frac{a}{b}");
    expect(omml).toContain("<m:f><m:num>");
    expect(omml).toContain("</m:num><m:den>");
  });

  it("renders binomials as bar-less fractions in parentheses", () => {
    const omml = convertLatex("\\binom{n}{k}");
    expect(omml).toContain('<m:type m:val="noBar"/>');
    expect(omml).toContain("<m:d>");
  });

  it("renders roots with hidden and explicit degrees", () => {
    expect(convertLatex("\\sqrt{x}")).toContain('<m:degHide m:val="1"/>');
    expect(convertLatex("\\sqrt[3]{x}")).toContain(
      "<m:deg><m:r><m:t>3</m:t></m:r></m:deg>",
    );
  });

  it("renders big operators as n-ary objects with the operand inside", () => {
    const display = convertLatex("\\sum_{i=1}^{n} i^2", true);
    expect(display).toContain('<m:chr m:val="∑"/>');
    expect(display).toContain('<m:limLoc m:val="undOvr"/>');
    expect(display).toContain("<m:e><m:sSup>");

    const inline = convertLatex("\\sum_{i=1}^{n} i^2", false);
    expect(inline).toContain('<m:limLoc m:val="subSup"/>');
  });

  it("omits m:chr for integrals (the OMML default operator)", () => {
    const omml = convertLatex("\\int_0^\\infty e^{-x} dx", true);
    expect(omml).toContain("<m:nary>");
    expect(omml).not.toContain("m:chr");
  });

  it("hides missing n-ary limits", () => {
    expect(convertLatex("\\oint_C f", true)).toContain(
      '<m:supHide m:val="1"/>',
    );
    const bare = convertLatex("\\sum x", true);
    expect(bare).toContain('<m:subHide m:val="1"/>');
    expect(bare).toContain('<m:supHide m:val="1"/>');
  });

  it("ends the n-ary operand at relations", () => {
    const omml = convertLatex("\\sum_{i} x = y", true);
    expect(omml).toContain("</m:nary>");
    // "= y" stays outside the n-ary operand (and merges into one run).
    expect(omml.indexOf("<m:t>=y</m:t>")).toBeGreaterThan(
      omml.indexOf("</m:nary>"),
    );
  });

  it("keeps scripted big operators without an operand out of n-ary form", () => {
    // An n-ary object with an empty operand would render a placeholder box
    // in Word.
    expect(convertLatex("\\sum_{i=1}^{n}", true)).not.toContain("m:nary");
  });

  it("renders \\left...\\right delimiters, including one-sided ones", () => {
    expect(convertLatex("\\left( \\frac{a}{b} \\right)", true)).toContain(
      "<m:d><m:e>",
    );
    const cases = convertLatex(
      "\\begin{cases} x & x > 0 \\\\ 0 & 1 \\end{cases}",
      true,
    );
    expect(cases).toContain('<m:begChr m:val="{"/>');
    expect(cases).toContain('<m:endChr m:val=""/>');
    const evaluation = convertLatex("\\left. x \\right|_{x=0}", true);
    expect(evaluation).toContain('<m:begChr m:val=""/>');
    expect(evaluation).toContain('<m:endChr m:val="∣"/>');
  });

  it("renders accents with combining characters", () => {
    expect(convertLatex("\\hat{x}")).toContain('<m:chr m:val="\u0302"/>');
    expect(convertLatex("\\vec{v}")).toContain('<m:chr m:val="\u20d7"/>');
    expect(convertLatex("\\bar{y}")).toContain('<m:chr m:val="\u0304"/>');
  });

  it("renders overline and underline as bars", () => {
    expect(convertLatex("\\overline{AB}")).toContain('<m:pos m:val="top"/>');
    expect(convertLatex("\\underline{x}")).toContain('<m:pos m:val="bot"/>');
  });

  it("renders braces as group characters with limits", () => {
    const omml = convertLatex("\\underbrace{a+b}_{n}", true);
    expect(omml).toContain('<m:chr m:val="⏟"/>');
    expect(omml).toContain("<m:limLow>");
  });

  it("maps math alphabets to Unicode alphanumerics", () => {
    // Adjacent runs with identical properties merge into one.
    expect(convertLatex("\\mathbb{R} \\mathcal{L} \\mathfrak{g}")).toContain(
      "<m:t>ℝℒ𝔤</m:t>",
    );
  });

  it("maps bold and upright variants to run styles", () => {
    const omml = convertLatex("\\mathbf{v} \\boldsymbol{\\alpha} \\mathrm{d}");
    expect(omml).toContain('<m:sty m:val="b"/>');
    expect(omml).toContain('<m:sty m:val="bi"/>');
    expect(omml).toContain('<m:sty m:val="p"/>');
  });

  it("renders function names upright and drops invisible operators", () => {
    const omml = convertLatex("\\sin x");
    expect(omml).toContain(
      '<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>sin</m:t></m:r>',
    );
    expect(omml).not.toContain("\u2061");
  });

  it("renders \\text as normal-text runs", () => {
    const omml = convertLatex("\\text{hello world}");
    expect(omml).toContain("<m:nor/>");
    // KaTeX replaces spaces in \text with non-breaking spaces.
    expect(omml).toContain("<m:t>hello world</m:t>");
  });

  it("renders matrices with column alignment", () => {
    const matrix = convertLatex(
      "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
      true,
    );
    expect(matrix).toContain("<m:m>");
    expect(matrix).toContain('<m:count m:val="2"/>');
    expect(matrix).toContain('<m:mcJc m:val="center"/>');
    // pmatrix wraps the matrix in parentheses.
    expect(matrix).toContain("<m:d>");

    const aligned = convertLatex(
      "\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}",
      true,
    );
    expect(aligned).toContain('<m:mcJc m:val="right"/>');
    expect(aligned).toContain('<m:mcJc m:val="left"/>');
  });

  it("renders boxes and strikethroughs", () => {
    expect(convertLatex("\\boxed{E}", true)).toContain("<m:borderBox><m:e>");
    const cancel = convertLatex("\\cancel{x}");
    expect(cancel).toContain('<m:strikeBLTR m:val="1"/>');
    expect(cancel).toContain('<m:hideTop m:val="1"/>');
  });

  it("renders phantoms as hidden content", () => {
    expect(convertLatex("a + \\phantom{b} + c")).toContain(
      '<m:show m:val="0"/>',
    );
  });

  it("preserves whitespace in space-only runs", () => {
    expect(convertLatex("a \\, b")).toContain('xml:space="preserve"');
  });

  it("escapes XML special characters in text and attributes", () => {
    // The adjacent plain runs merge, so the escaped text lands in one run.
    expect(
      mathMLToOMML("<math><mi>a&amp;b</mi><mo>&lt;</mo></math>"),
    ).toContain("<m:t>a&amp;b&lt;</m:t>");
    expect(
      mathMLToOMML(
        '<math><mfenced open="&quot;" close="&quot;"><mi>x</mi></mfenced></math>',
      ),
    ).toContain('<m:begChr m:val="&quot;"/>');
  });

  it("drops characters that XML 1.0 forbids", () => {
    // NUL, C0 controls and U+FFFE/U+FFFF have no XML representation; a
    // document containing them is rejected by Word rather than rendered.
    expect(
      mathMLToOMML("<math><mtext>a\u0000b\u000bc\u001fd\ufffee</mtext></math>"),
    ).toContain("<m:t>abcde</m:t>");
    // Attribute values go through the same filter (`open` reaches m:begChr).
    expect(
      mathMLToOMML('<math><mfenced open="[\uffff"><mi>x</mi></mfenced></math>'),
    ).toContain('<m:begChr m:val="["/>');
  });

  it("keeps valid surrogate pairs while dropping unpaired ones", () => {
    // Math alphanumerics live in the astral planes, so pairs must survive.
    expect(mathMLToOMML("<math><mi>\u{1D54F}</mi></math>")).toContain(
      "<m:t>\u{1D54F}</m:t>",
    );
    expect(mathMLToOMML("<math><mtext>a\uD800b</mtext></math>")).toContain(
      "<m:t>ab</m:t>",
    );
    expect(mathMLToOMML("<math><mtext>a\uDC00b</mtext></math>")).toContain(
      "<m:t>ab</m:t>",
    );
  });

  it("recovers from missing structure arguments", () => {
    expect(mathMLToOMML("<math><mfrac><mi>a</mi></mfrac></math>")).toContain(
      "</m:num><m:den/>",
    );
    expect(mathMLToOMML("<math><munder><mi>a</mi></munder></math>")).toContain(
      "<m:limLow><m:e><m:r><m:t>a</m:t></m:r></m:e><m:lim/></m:limLow>",
    );
    expect(
      mathMLToOMML(
        "<math><mmultiscripts><mi>x</mi><mn>2</mn></mmultiscripts></math>",
      ),
    ).toContain("<m:sSub>");
  });

  it("rejects non-MathML roots", () => {
    expect(() => mathMLToOMML("<div/>")).toThrow(UnsupportedMathMLError);
  });

  describe("long-tail MathML (hand-written, beyond the KaTeX dialect)", () => {
    it("converts mmultiscripts to chained scripts and prescripts", () => {
      const omml = mathMLToOMML(
        "<math><mmultiscripts><mi>R</mi><mi>i</mi><mi>j</mi>" +
          "<mprescripts/><mn>1</mn><none/></mmultiscripts></math>",
      );
      expect(omml).toContain("<m:sPre>");
      expect(omml).toContain("<m:sSubSup>");
      // The prescript pair has a subscript but no superscript.
      expect(omml).toContain("<m:sub><m:r><m:t>1</m:t></m:r></m:sub><m:sup/>");
    });

    it("skips none placeholders in mmultiscripts", () => {
      const omml = mathMLToOMML(
        "<math><mmultiscripts><mi>x</mi><none/><mn>2</mn></mmultiscripts></math>",
      );
      expect(omml).toContain("<m:sSup>");
      expect(omml).not.toContain("m:sSub>");
    });

    it("converts mfenced with custom delimiters and separators", () => {
      const omml = mathMLToOMML(
        '<math><mfenced open="[" close="]" separators=";"><mi>a</mi><mi>b</mi></mfenced></math>',
      );
      expect(omml).toContain('<m:begChr m:val="["/>');
      expect(omml).toContain('<m:sepChr m:val=";"/>');
      expect(omml).toContain('<m:endChr m:val="]"/>');
      expect(omml).toContain(
        "<m:e><m:r><m:t>a</m:t></m:r></m:e><m:e><m:r><m:t>b</m:t></m:r></m:e>",
      );
    });

    it("uses MathML's default comma separator for mfenced", () => {
      const omml = mathMLToOMML(
        "<math><mfenced><mi>a</mi><mi>b</mi></mfenced></math>",
      );
      expect(omml).toContain('<m:sepChr m:val=","/>');
      expect(omml).not.toContain("m:begChr");
    });

    it("converts ms to quoted normal text", () => {
      expect(mathMLToOMML("<math><ms>abc</ms></math>")).toContain(
        '<m:t>"abc"</m:t>',
      );
      expect(
        mathMLToOMML(`<math><ms lquote="'" rquote="'">abc</ms></math>`),
      ).toContain("<m:t>'abc'</m:t>");
    });

    it("inherits mathvariant from mstyle onto tokens", () => {
      const omml = mathMLToOMML(
        '<math><mstyle mathvariant="bold"><mi>x</mi>' +
          '<mi mathvariant="normal">y</mi></mstyle></math>',
      );
      expect(omml).toContain('<m:sty m:val="b"/>');
      // A token's own mathvariant wins over the inherited one.
      expect(omml).toContain('<m:sty m:val="p"/>');
    });

    it("renders maction as its first child", () => {
      const omml = mathMLToOMML(
        '<math><maction actiontype="toggle"><mi>a</mi><mi>b</mi></maction></math>',
      );
      expect(omml).toContain("<m:t>a</m:t>");
      expect(omml).not.toContain("<m:t>b</m:t>");
    });

    it("renders merror content", () => {
      expect(
        mathMLToOMML("<math><merror><mi>x</mi></merror></math>"),
      ).toContain("<m:t>x</m:t>");
    });

    it("renders menclose side borders", () => {
      const omml = mathMLToOMML(
        '<math><menclose notation="left bottom"><mi>x</mi></menclose></math>',
      );
      expect(omml).toContain('<m:hideTop m:val="1"/>');
      expect(omml).toContain('<m:hideRight m:val="1"/>');
      expect(omml).not.toContain("m:hideLeft");
      expect(omml).not.toContain("m:hideBot");
    });

    it("renders roundedbox as a plain border box", () => {
      expect(
        mathMLToOMML(
          '<math><menclose notation="roundedbox"><mi>x</mi></menclose></math>',
        ),
      ).toContain("<m:borderBox><m:e>");
    });

    it("treats largeop operators as n-ary", () => {
      const omml = mathMLToOMML(
        '<math><munder><mo largeop="true">⨆</mo><mi>i</mi></munder><mi>x</mi></math>',
      );
      expect(omml).toContain("<m:nary>");
      expect(omml).toContain('<m:chr m:val="⨆"/>');
    });

    it("recognizes accents without an accent attribute", () => {
      const omml = mathMLToOMML(
        "<math><mover><mi>x</mi><mo>&#x302;</mo></mover></math>",
      );
      expect(omml).toContain("<m:acc>");
    });

    it("drops alignment markers", () => {
      expect(
        mathMLToOMML(
          "<math><mrow><maligngroup/><mi>x</mi><malignmark/></mrow></math>",
        ),
      ).toContain("<m:t>x</m:t>");
    });

    it("rejects constructs with no OMML equivalent", () => {
      expect(() =>
        mathMLToOMML("<math><mstack><mn>1</mn></mstack></math>"),
      ).toThrow(UnsupportedMathMLError);
      expect(() => mathMLToOMML('<math><mglyph src="x.png"/></math>')).toThrow(
        UnsupportedMathMLError,
      );
    });
  });

  it("rejects unsupported MathML elements", () => {
    expect(() =>
      mathMLToOMML("<math><mmultiscripts></mmultiscripts></math>"),
    ).toThrow(UnsupportedMathMLError);
  });

  it("rejects malformed XML", () => {
    expect(() => mathMLToOMML("not xml")).toThrow(XmlParseError);
    expect(() => mathMLToOMML("<math><mi>x</mi>")).toThrow(XmlParseError);
  });
});
