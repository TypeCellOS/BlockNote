# Right-to-left (RTL)

Switch between Hebrew, Arabic, and Persian to try localized UI and sample content; changing language resets any edits. Use the selected dictionary, Mantine's `DirectionProvider`, and `dir="rtl"` on `BlockNoteView` to localize the UI and mirror the layout while keeping code left-to-right. The provider uses `initialDirection="rtl"` and `detectDirection={false}` so this example stays RTL independently of the surrounding playground.

**Try it out!** Edit the nested lists, open a block menu, edit the link, or type `/` and `:sm` in the empty paragraph to try the slash menu and emoji picker.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Localization](/docs/features/localization)
- [Mantine RTL setup](https://mantine.dev/styles/rtl/)
