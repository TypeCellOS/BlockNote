---
name: docs-skill
description: Conventions and verification workflow for writing and restructuring the documentation site (docs/content). Should be used when adding, editing, or reviewing docs pages.
---

# Documentation

The documentation site lives in `docs/content/docs` (fumadocs + Next.js). These are the conventions for writing and verifying it.

## Structure principles

- **Simple first, architecture later.** Lead every feature section with the shortest working setup (install, one snippet, "that's all"). Explain the underlying architecture and extension points afterwards, or in a separate "Custom …" section. Never make the reader wade through the extension contract to find the pre-configured default.
- **One page per feature the user searches for.** Users scan the sidebar for the thing they want — don't bury a feature inside a page about a different feature. Splitting a long page is preferable to a grab-bag: stale content hides in 400-line pages and gets found in 100-line ones.
- **Single-source each mechanism.** Document a mechanism in exactly one place — the page that owns the concept — and link to it from everywhere else it's relevant. Copies of the same explanation on multiple pages drift apart independently.
- **Complete implementations are live examples; page snippets are walkthroughs.** A page-length code block duplicating a full implementation is never compiled or run, so it silently rots — put the complete implementation in an embedded example (which is type-checked and rendered, so it can't) and keep page snippets small, each carrying one concept: a config shape, a component invocation, a signature.
- **Setup snippets are self-contained.** A snippet the reader is meant to copy includes the imports for each symbol it uses — without them it doesn't work when copied. Walkthrough fragments of an implementation the page's example completes may omit imports.
- **Order sections by audience breadth.** Content most readers need comes first; content specific to one feature or use case goes at the end of the page, even when it feels related to an earlier section. A reader following a cross-link to the specific section finds it regardless of position — the reader skimming the page shouldn't wade through it.
- **Live examples cap the setup they demonstrate.** Place an `<Example>` embed after the prose has introduced everything the example's code uses — an embed whose `App.tsx` shows APIs the page never mentions teaches by confusion. Introduced means named, given a purpose, and linked — the example itself (and the linked component pages) can carry the full wiring; expanding every integration inline pushes the example too far down the page. Not at the top (a demo without context motivates but doesn't teach) and not at the bottom (readers rarely reach it); at the end of the "getting it working" narrative, before advanced/optional topics. If an example uses more API than the page should cover, simplify the example rather than the rule.

- **Signature snippets tell the truth for one API.** A snippet formatted as a type signature documents exactly that export — never fold variant differences ("only for the X subpath…") into a doc-comment inside it. Show the signature that is true everywhere, and describe variant-specific options as prose in the variant's own section.
- **Docs follow the dependency direction.** When a package builds on another, the base layer's page owns the shared mechanisms (mappings, formats, behaviors) and never points "up" to a consumer page for its own concepts; consumer pages link down. Consumer pages still document their own API surfaces (option lists, signatures) explicitly rather than delegating them, per the signature rule below. Name sections for every layer they serve ("Typst / PDF", not just "PDF") so the base layer isn't erased.
- **Confine a cross-cutting concept to one designated section per page.** A page's headline concept (a conformance standard, an offline guarantee) gets one owning section; the intro may link to it once, and other sections mention it only where the reader must act on it there. Sprinkled re-mentions read as emphasis when written but age as duplication.
- **The hero snippet is the happy path only.** The first usage snippet shows the shortest end-to-end flow and nothing else; auxiliary mechanisms (asset maps, secondary outputs, tuning knobs) move to their own short sections even when genuinely relevant. Same for prose caveats aimed at a niche audience (a live-preview memory note): put them where that audience looks, not in the getting-started flow.
- **Caveats must be actionable.** Only note a limitation if the reader can do something with it (install a package, avoid a pattern, pass an option). Speculative hedges ("rare X may behave differently") and defensive implementation details (what a function guards against internally) erode trust without helping anyone act — cut them.

## Prose style

- Avoid em-dash-heavy prose; prefer commas, colons, semicolons, periods, or parentheses, choosing per sentence rather than substituting mechanically. An em-dash is fine occasionally; several per section reads as filler.
- Before listing something as a _requirement_, verify the reader can actually fail it. A "requirement" the implementation always satisfies automatically (e.g. auto-derived alt text) is at most a quality tip, phrased as one.

## Verifying content

- **Verify snippets against the actual package exports, not memory or existing docs.** APIs drift; grep the package source for every symbol a snippet imports (`export function X` / `export const X`) and check option names and shapes. Content copied forward without this check stays wrong after refactors.
- `node docs/validate-links.mjs` validates internal routes **and** `#anchors` (works from any directory). Anchors follow github-slugger: lowercased, spaces to dashes, symbols dropped — "A & B" becomes `#a--b`.
- **Render before declaring done**: `pnpm --filter docs run dev` (port 3000), then check each touched route returns 200 (the dev server compiles MDX on demand, so a 200 also proves the MDX compiles) and grep the HTML for expected headings/anchor ids. For visual checks, `cd tests && pnpm exec playwright screenshot --full-page --wait-for-timeout 8000 <url> <out.png>` and inspect the image — example embeds load lazily, so give them the wait.

## Site mechanics

- Navigation order comes from each directory's `meta.json` (`pages` array, `"..."` = the rest alphabetically). Directories without a `meta.json` sort alphabetically.
- `index.mdx` pages ending in `<CardTable path="..." />` list their section's pages automatically from frontmatter — new pages appear without extra wiring.
- `<Example name="group/project" />` embeds a live example; the name is the example's slug without number prefixes (`examples/06-custom-schema/09-math-block` → `custom-schema/math-block`).
- Frontmatter needs `title` and `description`; the description doubles as the CardTable card text.
- Strange dev-server behavior — `JSON.parse` errors on unrelated pages, new pages missing from the sidebar — usually means stale or corrupted generated state, not a content bug: restart the dev server (fumadocs' source map is built at startup) and, if errors persist, delete `docs/.next` (regenerable cache) before debugging further.
- Renaming or removing a heading breaks external links to its anchor silently — when restructuring, leave a pointer (e.g. a short "Related" section) where a well-known anchor used to be.
