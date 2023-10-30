---
title: Changing Font
description: In this example, we change the editor font.
imageTitle: Changing Font
path: /examples/changing-font
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Changing Font

In this example, we override some of the default editor CSS to change the font.

**Relevant Docs:**

- [Advanced: Overriding CSS](/docs/theming#advanced-overriding-css)

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  darkDefaultTheme,
  lightDefaultTheme,
  Theme,
  useBlockNote,
} from "@blocknote/react";

const componentStyles = (theme: Theme) => ({
  Editor: {
    '[data-node-type="blockContainer"] *': {
      fontFamily: "Comic Sans MS",
    },
  },
});

// Default dark theme with additional component styles.
const theme = {
  light: {
    ...lightDefaultTheme,
    componentStyles,
  },
  dark: {
    ...darkDefaultTheme,
    componentStyles,
  },
} satisfies {
  light: Theme;
  dark: Theme;
};

function App() {
  const editor = useBlockNote();

  return <BlockNoteView editor={editor} theme={theme} />;
}

export default App;

```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

There are several useful CSS selectors that you can use to style different parts of the editor:

- `[data-node-type="blockContainer"]` selects all blocks.
- `[data-content-type="X"]` selects the content of all blocks of type X (excluding child blocks). Can also have `[data-Y="..."]` attributes for each of the block's props that don't use the default value. E.g. `[data-content-type="heading"][data-level="2"]` will select all heading blocks with heading level 2.
- `[data-node-type="blockGroup"]` selects all wrapper elements for child blocks.