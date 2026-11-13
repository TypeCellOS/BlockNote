This document covers what testing infrastructure must be in place to ensure that BlockNote has a good level of accessibility. This means coverage of all areas discussed in Outline of Concerns.

# Legibility

## Contrast

Contrast requirements can be checked using static DOM analysis tools like [axe-core](https://github.com/dequelabs/axe-core/tree/develop). A rule like [color-contrast](https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=RuleDescription) calculates contrast between the CSS text and background colors for each element. It cannot check contrast for image, gradient, or other non-single-color backgrounds, but these aren't used in BlockNote, so it doesn't matter in our case. Visual regression testing is not necessary for checking contrast.

## Text Spacing & Resizing

The WCAG guidelines require that text spacing & sizing must be modifiable, and this is done in accessibility tools by overwriting CSS. Testing this is twofold. First, static DOM analysis using [axe-core](https://github.com/dequelabs/axe-core/tree/develop) ensures that no inline styles prevent CSS rules from applying. Visual regression testing is then used to capture screenshots and verify that content is not clipped, which is already part of our existing test infrastructure.

# Keyboard & Focus Handling

We already have keyboard handling as part of our existing tests. This is done in two ways:

1. Simulating key presses using synthetic events or directly calling their related handlers in a jsdom environment.
2. Driving the keyboard to dispatch real events in a real browser environment.

For accessibility purposes, we should be using a real browser environment. Simulated key presses in a jsdom environment are not guaranteed to behave the same as a real browser, while calling the handlers is not functionally different to having a unit test for that handler. We should refactor our existing jsdom tests to either unit or browser tests.

The scope of keyboard handling should include:

- Keyboard navigation through a page with interactive elements, including a BlockNote editor.
- Selections within an editor at different levels:
  - Selecting content within blocks.
  - Selecting entire blocks.
  - Selecting the entire editor.
- Focusing all interactive elements within default blocks, including media controls.
- Focusing/triggering all interactive elements in the BlockNote UI, including those gated behind hovering/focusing another element.

Visual regression testing should also be used to ensure the focused elements are visually distinct, e.g., using a focus ring.

# Screen Reader Announcements

Static DOM analysis tools like [axe-core](https://github.com/dequelabs/axe-core/tree/develop) can catch a large chunk of missing screen reader announcements through the presence of things like ARIA attributes. However, they are geared more towards static websites, and we are in a fairly unique position where the user is editing content as well as viewing it, and the content itself has significantly more markup than the average website. For example, our schema allows for block indentation. It's important that the indentation level of a block is communicated by a screen reader, but it's not something that static DOM analysis tools can catch.

Therefore, we should also incorporate automated screen reader testing, which lets you capture the output of a screen reader as a page is being navigated. This lets us ensure that BlockNote-specific semantics are captured by a screen reader. While screen readers have their own keyboard navigation and targeting, we don't need to test this. When navigating through the editor using a keyboard, the screen reader target will move with the selection. Advanced screen reader navigation, like [VoiceOver's rotor](https://support.apple.com/en-euro/guide/voiceover/mchlp2719/mac), is reliant on proper DOM element semantics and ARIA attributes, so it's tested implicitly by static DOM analysis tools.
