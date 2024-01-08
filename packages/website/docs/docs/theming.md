---
title: Theming & Styling
description: BlockNote allows you to change how the editor UI looks. You can change the theme of the default UI, or override its CSS styles.
imageTitle: Theming & Styling
path: /docs/theming
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "../demoUtils";

const { isDark } = useData();
</script>

# Theming & Styling

BlockNote allows you to change how the editor UI looks. You can change the theme of the default UI, or override its CSS styles.

BlockNote has both light and dark default themes, which are used based on the user's system settings.

## Theming & Styling in CSS

### Theming

By defining a set of CSS variables, you can easily change BlockNote's light & dark themes, which include colors, border radii, and font family. The example below shows each of the CSS variables you can set for BlockNote, with values from the default light theme:

```
--bn-colors-editor-text: #3F3F3F;
--bn-colors-editor-background: #FFFFFF;
--bn-colors-menu-text: #3F3F3F;
--bn-colors-menu-background: #FFFFFF;
--bn-colors-tooltip-text: #3F3F3F;
--bn-colors-tooltip-background: #EFEFEF;
--bn-colors-hovered-text: #3F3F3F;
--bn-colors-hovered-background: #EFEFEF;
--bn-colors-selected-text: #FFFFFF;
--bn-colors-selected-background: #3F3F3F;
--bn-colors-disabled-text: #AFAFAF;
--bn-colors-disabled-background: #EFEFEF;

--bn-colors-shadow: #CFCFCF;
--bn-colors-border: #EFEFEF;
--bn-colors-side-menu: #CFCFCF;

--bn-colors-highlights-gray-text: #9b9a97;
--bn-colors-highlights-gray-background: #ebeced;
--bn-colors-highlights-brown-text: #64473a;
--bn-colors-highlights-brown-background: #e9e5e3;
--bn-colors-highlights-red-text: #e03e3e;
--bn-colors-highlights-red-background: #fbe4e4;
--bn-colors-highlights-orange-text: #d9730d;
--bn-colors-highlights-orange-background: #f6e9d9;
--bn-colors-highlights-yellow-text: #dfab01;
--bn-colors-highlights-yellow-background: #fbf3db;
--bn-colors-highlights-green-text: #4d6461;
--bn-colors-highlights-green-background: #ddedea;
--bn-colors-highlights-blue-text: #0b6e99;
--bn-colors-highlights-blue-background: #ddebf1;
--bn-colors-highlights-purple-text: #6940a5;
--bn-colors-highlights-purple-background: #eae4f2;
--bn-colors-highlights-pink-text: #ad1a72;
--bn-colors-highlights-pink-background: #f4dfeb;

--bn-font-family: "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
--bn-border-radius: 6px;
```

Setting these variables on the `.bn-container[data-color-scheme]` selector will apply them to the editor. You can also specify them separately for light & dark mode based on the value of `data-color-scheme` (`"light"` or `"dark"`).

In the demo below, we set a red theme for the editor which changes based on if light or dark mode is used:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css
{{ getStyles(isDark) }}

/* Base theme */
.bn-container[data-color-scheme] {
  --bn-colors-editor-text: #222222;
  --bn-colors-editor-background: #ffffff;
  --bn-colors-menu-text: #ffffff;
  --bn-colors-menu-background: #9b0000;
  --bn-colors-tooltip-text: #ffffff;
  --bn-colors-tooltip-background: #b00000;
  --bn-colors-hovered-text: #ffffff;
  --bn-colors-hovered-background: #b00000;
  --bn-colors-selected-text: #ffffff;
  --bn-colors-selected-background: #c50000;
  --bn-colors-disabled-text: #9b0000;
  --bn-colors-disabled-background: #7d0000;
  --bn-colors-shadow: #640000;
  --bn-colors-border: #870000;
  --bn-colors-side-menu: #bababa;
  --bn-color-highlight-colors: #ffffff;
  --bn-border-radius: 4px;
  --bn-font-family: Helvetica Neue, sans-serif;
}

/* Changes for dark mode */
.bn-container[data-color-scheme="dark"] {
  --bn-colors-editor-text: #ffffff;
  --bn-colors-editor-background: #9b0000;
  --bn-colors-side-menu: #ffffff;
}
```

:::

### Styling

If you want to change the editor's look even more, you can override CSS styles for the editor, as well as all menus and toolbars.

In the demo below, we create additional CSS rules to add some basic styling to the editor, and also make all hovered slash menu items blue:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css
{{ getStyles(isDark) }}

/* Adds border and shadow to editor */
.bn-container .bn-editor {
  border-radius: var(--bn-border-radius-medium);
  box-shadow: var(--bn-shadow-medium);
}

/* Makes slash menu hovered items blue */
.bn-container .bn-slash-menu .mantine-Menu-item[data-hovered] {
  background-color: blue;
}
```

:::

## Theming in Code

BlockNote also allows you to change the editor theme via the `theme` prop in `BlockNoteView`, which allows you to force one of the default themes by passing in `"light"` or `"dark"`.

However, you can also override the default themes using `Theme` objects, much like you can [with CSS](/docs/theming#theming):
```ts
type CombinedColor = {
  text: string;
  background: string;
};

type ColorScheme = {
  editor: CombinedColor;
  menu: CombinedColor;
  tooltip: CombinedColor;
  hovered: CombinedColor;
  selected: CombinedColor;
  disabled: CombinedColor;
  shadow: string;
  border: string;
  sideMenu: string;
  highlights: {
    gray: CombinedColor;
    brown: CombinedColor;
    red: CombinedColor;
    orange: CombinedColor;
    yellow: CombinedColor;
    green: CombinedColor;
    blue: CombinedColor;
    purple: CombinedColor;
    pink: CombinedColor;
  };
};

type Theme = {
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
};
```

You can pass a `Theme` object to the `theme` prop in `BlockNoteView` to set a single custom theme regardless of light/dark mode being used. Alternatively, you can specify themes for both light and dark mode by passing the following object:

```ts
type LightAndDarkThemes = {
  light: Theme;
  dark: Theme;
}
```

Note that this will also override any theme set via CSS variables.

In the demo below, we create the same red theme as from the [CSS demo](/docs/theming#css-theming-styling), but this time we set it via the `theme` prop in `BlockNoteView`:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  darkDefaultTheme,
  lightDefaultTheme,
  Theme,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

// Base theme
const lightRedTheme = {
  colors: {
    editor: {
      text: "#222222",
      background: "#ffffff",
    },
    menu: {
      text: "#ffffff",
      background: "#9b0000",
    },
    tooltip: {
      text: "#ffffff",
      background: "#b00000",
    },
    hovered: {
      text: "#ffffff",
      background: "#b00000",
    },
    selected: {
      text: "#ffffff",
      background: "#c50000",
    },
    disabled: {
      text: "#9b0000",
      background: "#7d0000",
    },
    shadow: "#640000",
    border: "#870000",
    sideMenu: "#bababa",
    highlights: lightDefaultTheme.colors.highlights,
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
} satisfies Theme;

// Changes for dark mode
const darkRedTheme = {
  ...lightRedTheme,
  colors: {
    ...lightRedTheme.colors,
    editor: {
      text: "#ffffff",
      background: "#9b0000",
    },
    sideMenu: "#ffffff",
    highlights: darkDefaultTheme.colors.highlights,
  },
} satisfies Theme;

const redTheme = {
  light: lightRedTheme,
  dark: darkRedTheme,
};

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      // Sets the red theme
      theme={redTheme}
    />
  );
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

If we pass both a light and dark theme to `BlockNoteView`, like in the demo, BlockNote automatically chooses which one to use based on the user's browser settings. However, you can just pass `"light"`/`"dark"` (for the light & dark default themes), or a single custom theme instead, if you want to use the same one regardless of browser settings.

## Adding DOM Attributes

You can set additional HTML attributes on most DOM elements inside the editor, which let you change the way that blocks are styled.

In the demo below, we set a custom class on the `blockContainer` element to add a border to each block:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Sets attributes on DOM elements in the editor.
    domAttributes: {
      // Adds a class to all `blockContainer` elements.
      blockContainer: {
        class: "block-container",
      },
    },
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={"{{ getTheme(isDark) }}"} />;
}
```

```css-vue /styles.css
{{ getStyles(isDark) }}

.block-container {
  border: 2px solid lightgray;
  border-radius: 4px;
  padding: 2px;
  margin: 2px;
}
```

:::

There are a number of elements that you can set classes for:

`editor:` The editor itself, excluding menus & toolbars.

`blockContainer:` The main container element for blocks. Contains both the block's content and its nested blocks.

`blockGroup:` The wrapper element for all top-level blocks in the editor and nested blocks.

`blockContent:` The wrapper element for a block's content.

`inlineContent:` The wrapper element for a block's rich-text content.