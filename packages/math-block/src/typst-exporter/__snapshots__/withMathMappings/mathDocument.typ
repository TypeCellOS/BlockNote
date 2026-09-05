#set document(title: "Math")
#set text(font: "Inter 18pt", size: 12pt)
#set page(paper: "a4", margin: 48pt)
#set par(leading: 0.78em, spacing: 0pt, justify: false)
#set block(spacing: 0pt)
#set list(spacing: 0pt)
#set list(marker: ([•], [◦], [▪]))
#set enum(spacing: 0pt)
#set heading(numbering: none)
#show heading: set text(weight: 700)
#show heading.where(level: 1): set text(size: 36pt)
#show heading.where(level: 2): set text(size: 24pt)
#show heading.where(level: 3): set text(size: 15.6pt)
#show heading.where(level: 4): set text(size: 12pt)
#show heading.where(level: 5): set text(size: 10.8pt)
#show heading.where(level: 6): set text(size: 9.6pt)
#set raw(theme: "/assets/code-theme.tmTheme")
#show raw: set text(font: "Geist Mono", ligatures: false)
#show raw.where(block: false): set text(fill: black)
#show raw.where(block: true): it => block(width: 100%, inset: 18pt, radius: 6pt, fill: rgb("#161616"), text(fill: rgb("#e1e4e8"), it))
#show quote.where(block: true): it => block(inset: (left: 14pt, y: 4pt), stroke: (left: 2pt + rgb("#7D797A")), text(fill: rgb("#7D797A"), it.body))
#set figure(numbering: none)
#show figure: set block(breakable: false)
#show figure.caption: set text(size: 9.6pt, fill: luma(110))
#show link: set text(fill: rgb("#0b6e99"))
#let _cb-box(fill, stroke, tick) = box(baseline: 0.13em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + stroke, fill: fill, tick)
#let _cb-unchecked = _cb-box(white, luma(148), none)
#let _cb-checked = _cb-box(rgb("#3183c8"), rgb("#3183c8"), place(top + left, curve(
  stroke: (paint: white, thickness: 0.11em, cap: "round", join: "round"),
  curve.move((0.20em, 0.47em)),
  curve.line((0.37em, 0.63em)),
  curve.line((0.70em, 0.27em)),
)))

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#math.equation(block: true, alt: "a^2 = \\sqrt{b^2 + c^2}", $ a^2 = sqrt(b^2 + c^2) $)]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Inline math: "#math.equation(alt: "e^{i\\pi} + 1 = 0", $e^(i pi) + 1 = 0$)]
