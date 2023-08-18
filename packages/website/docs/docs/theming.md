---
title: Theming & Styling
description: BlockNote allows you to change how the editor UI looks. You can change the theme of the default UI, or override its CSS styles.
imageTitle: Theming & Styling
path: /docs/theming
---

<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils";

const { isDark } = useData();
</script>

# Theming & Styling

BlockNote allows you to change how the editor UI looks. You can change the theme of the default UI, or override its CSS styles.

## Theming

If you want to make small adjustments to BlockNote's UI, you can create a custom theme, which will let you change colors, fonts, and border radii. You can do this by passing partial `Theme` objects to `BlockNoteView`.

Take a look at how this is done in the demo below:

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
import "@blocknote/core/style.css";

// Custom red light theme
const lightRedTheme = {
  type: "light",
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
    highlightColors: lightDefaultTheme.colors.highlightColors,
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
} satisfies Theme;

// Custom red dark theme
const darkRedTheme = {
  ...lightRedTheme,
  type: "dark",
  colors: {
    ...lightRedTheme.colors,
    editor: {
      text: "#ffffff",
      background: "#9b0000",
    },
    sideMenu: "#ffffff",
    // TODO: Update
    highlightColors: darkDefaultTheme.colors.highlightColors,
  },
} satisfies Theme;

// Combining the custom themes into a single theme object.
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
      // Adding the custom themes. The editor will use the browser settings to
      // determine if the light or dark theme is used.
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
import "@blocknote/core/style.css";

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

## Advanced: Overriding CSS

If you want to change the editor's look even more, you can override CSS styles for both the editor, and all menus as well as toolbars. You do this by creating CSS objects for various components in the `componentStyles` field of your [theme](/docs/theming#theming).

In the demo below, we use it to add some basic styling to the editor's default dark theme, and also make all hovered dropdown & menu items blue:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  darkDefaultTheme,
  Theme,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";

// Default dark theme with additional component styles.
const theme = {
  ...darkDefaultTheme,
  componentStyles: (theme) => ({
    // Adds basic styling to the editor.
    Editor: {
      backgroundColor: theme.colors.editor.background,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.colors.border}`,
      boxShadow: `0 4px 12px ${theme.colors.shadow}`,
    },
    // Makes all hovered dropdown & menu items blue.
    Menu: {
      ".mantine-Menu-item[data-hovered], .mantine-Menu-item:hover": {
        backgroundColor: "blue",
      },
    },
    Toolbar: {
      ".mantine-Menu-dropdown": {
        ".mantine-Menu-item:hover": {
          backgroundColor: "blue",
        },
      },
    },
  }),
} satisfies Theme;

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={theme} />;
}
```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

There are a number of components that you can override styles for:

`ActionIcon:` Generic component used for Side Menu items & Formatting Toolbar buttons.

`Menu:` Generic component used for the Slash Menu, Formatting Toolbar dropdowns, and color picker dropdown.

`ColorIcon:` Icon in the color picker dropdown (Formatting Toolbar & Drag Handle Menu).

`DragHandleMenu:` Component used for the [Drag Handle Menu](/docs/side-menu)

`EditHyperlinkMenu:` Menu to edit hyperlinks, opened from the Formatting Toolbar or Hyperlink Toolbar.

`Editor:` The editor itself, excluding menus & toolbars.

`Toolbar:` Component used for the [Formatting Toolbar](/docs/formatting-toolbar) and Hyperlink Toolbar.

`Tooltip:` Component for the tooltip that appears on hover, for Formatting Toolbar & Hyperlink Toolbar buttons.

`SlashMenu:` Component used for the [Slash Menu](/docs/slash-menu).

`SideMenu:` Component used for the [Side Menu](/docs/side-menu).