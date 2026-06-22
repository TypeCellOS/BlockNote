#set document(title: "BlockNote Export", author: "BlockNote")
#set text(font: "Inter 18pt", size: 12pt, lang: "en")
#set page(paper: "a4", margin: (top: 35pt, bottom: 65pt, x: 35pt))
#set par(leading: 0.75em, spacing: 1.1em, justify: false)
#set heading(numbering: none)
#show heading: set text(weight: 700)
#show heading.where(level: 1): set text(size: 24pt)
#show heading.where(level: 2): set text(size: 18pt)
#show heading.where(level: 3): set text(size: 14pt)
#show heading.where(level: 4): set text(size: 12pt)
#show heading.where(level: 5): set text(size: 10pt)
#show heading.where(level: 6): set text(size: 8pt)
#show raw: set text(font: "Geist Mono")
#show raw.where(block: true): it => block(width: 100%, inset: 12pt, radius: 3pt, fill: luma(248), stroke: 0.5pt + luma(210), it)
#show quote.where(block: true): it => block(inset: (left: 12pt), stroke: (left: 2pt + rgb("#7D797A")), text(fill: rgb("#7D797A"), it.body))
#show figure.caption: set text(size: 9.6pt, fill: luma(110))
#show link: set text(fill: rgb("#0b6e99"))

#emph("Welcome to this ")#strong(emph("demo 🙌!"))
#pad(left: 1.5em)[
#"Hello World nested"
#pad(left: 1.5em)[
#"Hello World double nested"
]
]

#block(fill: rgb("#fbe4e4"), inset: 6pt, radius: 2pt, width: 100%)[#strong("This paragraph has a background color")]

#"Paragraph"

#heading(level: 1, outlined: true)[#"Heading"]

#align(right)[#heading(level: 1, outlined: true)[#"Heading right"]]

#par(justify: true)[#"justified paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."]

#pagebreak(weak: true)

#list(
  [#"Bullet List Item. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
#list(
  [#"Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."],
  [#align(right)[#"Bullet List Item right. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."]]
)

#enum(
  [#"Numbered List Item 1"],
  [#"Numbered List Item 2"
#enum(
  [#"Numbered List Item Nested 1"],
  [#"Numbered List Item Nested 2"],
  [#align(right)[#block(fill: rgb("#fbe4e4"), inset: 6pt, radius: 2pt, width: 100%)[#text(fill: rgb("#0b6e99"))[#"Numbered List Item Nested funky right"]]]],
  [#align(center)[#block(fill: rgb("#fbe4e4"), inset: 6pt, radius: 2pt, width: 100%)[#text(fill: rgb("#0b6e99"))[#"Numbered List Item Nested funky center"]]]]
)]
)]
)

#enum(
  [#"Numbered List Item"]
)

#list(marker: none,
  [#"[ ] "#"Check List Item"]
)

#table(
  columns: (150.0pt, auto, auto),
  stroke: 0.5pt + luma(200),
  inset: 6pt,
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
)

#figure(rect(width: 80%, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), alt: "File")

#figure(rect(width: 80%, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), caption: [#"From https://placehold.co/332x322.jpg"], alt: "From https://placehold.co/332x322.jpg")

#align(right)[#figure(rect(width: 150.0pt, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), alt: "https://placehold.co/332x322.jpg")]

#figure(rect(width: 80%, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), caption: [#"From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"], alt: "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm")

#figure(rect(width: 80%, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), caption: [#"From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"], alt: "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3")



#figure(rect(width: 80%, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180)), caption: [#"Audio file caption"], alt: "Audio file caption")

#strong("Inline Content:")

#highlight(fill: rgb("#ddebf1"), text(fill: rgb("#e03e3e"), emph(strong("Styled Text"))))#" "#link("https://www.blocknotejs.org")[#"Link"]

#table(
  columns: (auto, auto, auto),
  stroke: 0.5pt + luma(200),
  inset: 6pt,
  [#"Table Cell 1"], [#"Table Cell 2"], [#"Table Cell 3"],
  [#"Table Cell 4"], [#strong("Table Cell Bold 5")], [#"Table Cell 6"],
  [#"Table Cell 7"], [#"Table Cell 8"], [#"Table Cell 9"],
)

#raw("const helloWorld = (message) => {\n  console.log(\"Hello World\", message);\n};", block: true, lang: "javascript")

#strong("Some inline code: ")#raw("var foo = 'bar';")

#line(length: 100%, stroke: 0.5pt + luma(200))

#quote(block: true)[#"All those moments will be lost in time, like tears in rain."]
