This document covers the main areas that are most relevant to the editor regarding accessibility. These areas are derived from:

- The list of issues found by the Docs team in an accessibility audit (marked with the a11y tag on GitHub).
- Scanning through the WCAG 2.0–2.2 guidelines and identifying likely problem areas.
- Long-standing UX issues that relate to accessibility but haven't yet been formally documented.

# Legibility

Sight-impaired users need to be able to read text in the editor body as well as in interactive elements like menus and toolbars. The following concerns are most relevant to BlockNote for accessibility.

## Contrast

WCAG sets guidelines for [minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [enhanced](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced) contrast that text has to have against its background to be legible.

## Text Spacing & Resizing

Vision-impaired users have tools available, which make text on a page easier to read by applying additional CSS styles. There are WCAG guidelines that state the upper limits of how the text's [size](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html) and [spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html) may be increased, without causing content to clip.

# Keyboard & Focus Handling

Users with impaired motor control will use a keyboard or other device that relies solely on buttons to navigate a page. When it comes to BlockNote, there are a few specific cases
that we need to consider.

## Editor Focus

Currently, the editor can be pretty annoying when moving focus around a page. Once focus lands on the editor, it immediately snaps to the editor's selection. This is fine for when the user wants to focus the editor, but less pretty annoying when moving around the page and having to focus the editor due to tab order. Since it has its own tab handling, trying to move focus outside it can be frustrating.

## Block Selection

There is a distinction between selecting all content within a block and selecting the entire block, especially for things like backspace handling. This distinction is currently unclear to the user, selected blocks are not always clearly highlighted, and it's only possible to select an entire block with text content using Cmd+Click.

## Interactive Block Elements

Some blocks contain interactive elements within them, e.g., checkboxes in check list items. These are not accessible while the editor is focused and are otherwise, but their tab order is not at all intuitive.

## UI Elements

Some work has been put into making the formatting and link toolbars accessible. Suggestion menus are also keyboard-accessible. For other UI elements, keyboard navigation is either completely broken (e.g., side menu) or not considered (e.g., file panel).

## Hover Controls

Any controls that are exposed by hovering an element with the mouse cursor or focusing it must be accessible with the keyboard, as per this [WCAG guideline](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

# Screen Reader Announcements

When screen readers announce content within the editor, they must also announce additional semantic information that would be useful when viewing and editing a document.

## Screen Reader Focus

Screen readers have their own keyboard navigation and target handling separate from the browser. This means that while an element is focused in the browser, the user can still move the screen reader to target other elements on the page. However, moving around the editor using the keyboard moves the screen reader target with it, so generally everything should work out-of-the-box in our case.

## Markup

The editor contains a lot of markup that is currently not announced by screen readers but is required for the user to understand the document structure. This is generally fixed using ARIA attributes and includes things like:

- Block type
- Block nesting
- Block children
- Block colors
- Table row/column information
- ...
