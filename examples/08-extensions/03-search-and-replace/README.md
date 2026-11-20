# Search and Replace

`SearchAndReplaceExtension` adds search, match navigation, and replacement to your editor. It is opt-in and is not registered in the default editor. UI is deliberately left to consumers: the only implemented UI is the Mantine component in this example, which you can copy or adapt to your preferences.

**Try it out:** Click Find or press Cmd/Ctrl+F inside the editor, search for `fox`, and expand Replace to change one match or all matches.

## Usage

Install the extension when creating your editor, then use its methods to drive your own controls:

```ts
import { BlockNoteEditor } from "@blocknote/core";
import { SearchAndReplaceExtension } from "@blocknote/core/extensions";

const editor = BlockNoteEditor.create({
  extensions: [SearchAndReplaceExtension()],
});
const search = editor.getExtension(SearchAndReplaceExtension)!;

search.setQuery({ searchTerm: "fox" });
search.nextMatch();
search.replace("wolf");
search.replaceAll("wolf");
search.clearSearch();
```

For the example UI, copy `SearchAndReplace.tsx` and `style.css`, then wrap your `BlockNoteView` with `<SearchAndReplace editor={editor}>` as shown in `App.tsx`.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Extensions](/docs/features/extensions)
