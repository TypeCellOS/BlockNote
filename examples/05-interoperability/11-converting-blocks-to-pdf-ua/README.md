# Exporting documents to tagged PDF (PDF/UA)

This example exports the current document to an **accessible, tagged PDF/UA-1**
file using the Typst-powered `@blocknote/xl-pdf-renderer-2`. Unlike a plain PDF,
a tagged PDF carries a logical structure tree (headings, paragraphs, lists,
tables, figures with alt text, links) that screen readers can navigate.

**Try it out:** Edit the document — the PDF preview updates live. Click
"Download" to save it, then verify it with a tool like
[veraPDF](https://verapdf.org/) (`--flavour ua1`) or the Acrobat Tags panel.

> The first export downloads the Typst compiler (wasm) and fonts, so it may take
> a moment. Images render as tagged placeholder figures for now.
