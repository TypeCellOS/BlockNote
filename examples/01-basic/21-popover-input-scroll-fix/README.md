# Input in Popover Closing Keyboard (Fixed)

This is the same editor + dummy formatting toolbar as the `popover-input-keyboard` example, but with the fix from [PR #2982](https://github.com/TypeCellOS/BlockNote/pull/2982) applied. Calling `scrollIntoView` on the input just before focus moves to it (on pointer-down capture, which fires before focus — unlike click) stops Android Chrome from dismissing the virtual keyboard.

**Try it out:** On a mobile device, select some text near the bottom of the screen, open the popover, and tap the input — the keyboard now stays open.

**Relevant Docs:**

- [Changing the Formatting Toolbar](/docs/react/components/formatting-toolbar)
- [Mantine Popover](https://mantine.dev/core/popover/)
- [Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
