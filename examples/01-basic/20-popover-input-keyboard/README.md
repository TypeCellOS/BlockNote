# Input in Popover Closing Keyboard

This example is a real BlockNote editor with a dummy formatting toolbar holding a single Mantine popover, whose dropdown contains a text input - mirroring the real thing, where buttons like the file caption / rename buttons open a popover input from the toolbar. There's enough content to scroll a selection (and with it the toolbar) anywhere between the top & bottom of the screen.

On Android Chrome, focusing the input while the toolbar is low in the viewport opens the virtual keyboard and then immediately dismisses it, since the browser can't scroll an input inside a popover into view. See the `popover-input-scroll-fix` example for a workaround.

**Try it out:** On a mobile device, select some text near the bottom of the screen, open the popover, and tap the input.

**Relevant Docs:**

- [Changing the Formatting Toolbar](/docs/react/components/formatting-toolbar)
- [Mantine Popover](https://mantine.dev/core/popover/)
