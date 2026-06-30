#set document(title: "BlockNote Export", author: "BlockNote")
#set text(font: ("Inter 18pt", "Noto Color Emoji"), size: 12pt, lang: "en")
#set page(paper: "a4", margin: 48pt)
#set par(leading: 0.78em, spacing: 0pt, justify: false)
#set block(spacing: 0pt)
#set list(spacing: 0pt)
#set enum(spacing: 0pt)
#set heading(numbering: none)
#show heading: set text(weight: 700)
#show heading.where(level: 1): set text(size: 36pt)
#show heading.where(level: 2): set text(size: 24pt)
#show heading.where(level: 3): set text(size: 15.6pt)
#show heading.where(level: 4): set text(size: 12pt)
#show heading.where(level: 5): set text(size: 10.8pt)
#show heading.where(level: 6): set text(size: 9.6pt)
#show raw: set text(font: "Geist Mono")
#show raw.where(block: true): it => block(width: 100%, inset: 12pt, radius: 3pt, fill: luma(248), stroke: 0.5pt + luma(210), it)
#show quote.where(block: true): it => block(inset: (left: 14pt, y: 4pt), stroke: (left: 2pt + rgb("#7D797A")), text(fill: rgb("#7D797A"), it.body))
#set figure(numbering: none)
#show figure.caption: set text(size: 9.6pt, fill: luma(110))
#show link: set text(fill: rgb("#0b6e99"))
#let _cb-unchecked = box(baseline: 0.24em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + luma(148), fill: white)
#let _cb-checked = box(baseline: 0.24em, width: 0.9em, height: 0.9em, radius: 2pt, stroke: 0.08em + rgb("#3183c8"), fill: rgb("#3183c8"), place(center + horizon, {
  box(move(dx: -0.11em, dy: 0.05em, rotate(45deg, line(length: 0.2em, stroke: white + 0.11em))))
  box(move(dx: 0.02em, dy: -0.04em, rotate(-45deg, line(length: 0.38em, stroke: white + 0.11em))))
}))

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#emph("Welcome to this ")#strong(emph("demo 🙌!"))
#pad(left: 1.5em)[
#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Hello World nested"
#pad(left: 1.5em)[
#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Hello World double nested"]
]]
]]

#block(width: 100%, fill: rgb("#fbe4e4"), inset: (x: 6pt, top: 6.9pt, bottom: 6.9pt))[#strong("This paragraph has a background color")]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Paragraph"]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 1, outlined: true)[#"Heading"]]

#align(right)[#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 1, outlined: true)[#"Heading right"]]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 2, outlined: true)[#"Heading 2"]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 3, outlined: true)[#"Heading 3"]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 4, outlined: true)[#"Heading 4"]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 5, outlined: true)[#"Heading 5"]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 6, outlined: true)[#"Heading 6"]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Emojis: 😀 🎉 🚀 👍 👍🏽 🌍 🚶‍♀️"]

#align(center)[#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Centered paragraph"]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#par(justify: true)[#"justified paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."]]

#pagebreak(weak: true)

#list(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Bullet List Item. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

#list(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."]],
  [#align(right)[#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Bullet List Item right. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."]]]
)

#enum(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item 1"]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item 2"

#enum(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item Nested 1"]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item Nested 2"]],
  [#align(right)[#block(width: 100%, fill: rgb("#fbe4e4"), inset: (x: 6pt, top: 6.9pt, bottom: 6.9pt))[#text(fill: rgb("#0b6e99"))[#"Numbered List Item Nested funky right"]]]],
  [#align(center)[#block(width: 100%, fill: rgb("#fbe4e4"), inset: (x: 6pt, top: 6.9pt, bottom: 6.9pt))[#text(fill: rgb("#0b6e99"))[#"Numbered List Item Nested funky center"]]]]
)]]
)]]
)

#enum(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item"]]
)

#list(marker: none,
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#list(marker: _cb-unchecked, [#"Check List Item"])]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#list(marker: _cb-checked, [#"Checked List Item"])]]
)

#enum(
  start: 5,
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item starting at 5"]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Numbered List Item 6"]]
)

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#box(baseline: 0.02em, move(dy: 0.04em, polygon(fill: luma(115), (0pt, 0pt), (0.32em, 0.2em), (0pt, 0.4em))))#h(0.35em)#"Toggle List Item"
#pad(left: 1.5em)[
#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Content nested inside the toggle list item."]

#list(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"A nested bullet inside the toggle"]]
)
]]

#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 2, outlined: true)[#"Toggle Heading"]
#pad(left: 1.5em)[
#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Content nested inside the toggle heading."]
]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#table(
  columns: (150.0pt, auto, auto),
  stroke: 0.5pt + luma(200),
  inset: 6pt,
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
  [#"Wide Cell"], [#"Table Cell"], [#"Table Cell"],
)]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Open file"]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#[#show figure: set align(left); #figure(image("/assets/asset-0.jpg", width: 80%), caption: [#"From https://placehold.co/332x322.jpg"], alt: "From https://placehold.co/332x322.jpg")]]

#align(right)[#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#[#show figure: set align(right); #figure(image("/assets/asset-0.jpg", width: 150.0pt), alt: "https://placehold.co/332x322.jpg")]]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#link("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm")[#"Open video file"]#linebreak()#text(size: 9.6pt, fill: luma(110))[#"From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#link("https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3")[#"Open audio file"]#linebreak()#text(size: 9.6pt, fill: luma(110))[#"From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"]]



#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"audio.mp3"#linebreak()#text(size: 9.6pt, fill: luma(110))[#"Audio file caption"]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#strong("Inline Content:")]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#highlight(fill: rgb("#ddebf1"), text(fill: rgb("#e03e3e"), emph(strong("Styled Text"))))#" "#underline("underlined")#" "#strike("strikethrough")#" "#link("https://www.blocknotejs.org")[#"Link"]]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#table(
  columns: (auto, auto, auto),
  stroke: 0.5pt + luma(200),
  inset: 6pt,
  table.header([#strong[#"Table Header 1"]], [#strong[#"Table Header 2"]], [#strong[#"Table Header 3"]]),
  [#"Table Cell 4"], [#highlight(fill: rgb("#ddebf1"), text(fill: rgb("#e03e3e"), strong("Table Cell Bold Colored 5")))], [#"Table Cell 6"],
  [#"Table Cell 7"], [#"Table Cell 8"], [#"Table Cell 9"],
)]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#raw("const helloWorld = (message) => {\n  console.log(\"Hello World\", message);\n};", block: true, lang: "javascript")]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#strong("Some inline code: ")#raw("var foo = 'bar';")]

#grid(
  columns: (0.8fr, 1.4fr, 0.8fr),
  column-gutter: 1em,
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"This paragraph is in a column!"]],
  [#block(width: 100%, inset: (top: (8pt + 6.9pt), bottom: 6.9pt))[#heading(level: 1, outlined: true)[#"So is this heading!"]]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"You can have multiple blocks in a column too"]

#list(
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Block 1"]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Block 2"]],
  [#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#"Block 3"]]
)]
)

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#line(length: 100%, stroke: 0.5pt + luma(200))]

#block(width: 100%, inset: (top: 6.9pt, bottom: 6.9pt))[#quote(block: true)[#"All those moments will be lost in time, like tears in rain."]]
