# Localization (i18n)

In this example, we use a dropdown to switch the editor between all of the languages that BlockNote ships with, by passing the matching dictionary from `@blocknote/core/locales` to the editor. Selecting a language re-mounts the editor so the interface strings update immediately. The document is saved outside the editor and restored on re-mount, preserving your content (but not the undo history or selection).

You can also provide your own dictionary to customize the strings used in the editor, or submit a Pull Request to add support for your language of your choice.

**Relevant Docs:**

- [Localization](/docs/features/localization)
