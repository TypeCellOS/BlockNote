---
title: Changing UI Elements
description: Along with the editor itself, BlockNote includes menus and toolbars which you can replace or remove.
imageTitle: Changing UI Elements
path: /docs/ui-elements
---


<script setup>
import { useData } from 'vitepress';
import { getTheme, getStyles } from "./demoUtils";

const { isDark } = useData();
</script>

# Changing UI Elements

Along with the editor itself, BlockNote includes a few additional UI elements in the forms of menus and toolbars:

- [Formatting Toolbar](/docs/formatting-toolbar)
- Hyperlink Toolbar
- [Slash Menu](/docs/slash-menu)
- [Side Menu](/docs/side-menu)

By default, these are all included in the editor, but you can remove or replace each of them with your own React components.

## Positioner Components

Each of the UI elements not only have to show and hide, but also show in the correct positions. This is handled using `Positioner` components. Each UI element has its own `Positioner` component, e.g. the Formatting Toolbar:

```jsx
export const FormattingToolbarPositioner = (props: {
    editor: BlockNoteEditor<BSchema>;
    formattingToolbar?: FC<FormattingToolbarProps<BSchema>>;
}): JSX.Element => {
    ...
}
```

## Removing UI Elements

In the following example, we remove the Side Menu from the editor. This is done by adding `Positioner` components for each UI element except the Side Menu:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
    </BlockNoteView>
  );
}

```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}
```

:::

Each further `Positioner` component you remove will remove its corresponding UI element from the editor. If you only want to keep the editor itself, add only an empty fragment (`<></>`) to `BlockNoteView`'s children.

## Replacing UI Elements

In the following example, the Side Menu is replaced with a simple component which just displays the name of the element:

::: sandbox {template=react-ts}

```typescript-vue /App.tsx
import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/core/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    theme: "{{ getTheme(isDark) }}",
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner
        editor={editor}
        sideMenu={() => <div className={"sideMenu"}>Side Menu</div>}
      />
    </BlockNoteView>
  );
}

```

```css-vue /styles.css [hidden]
{{ getStyles(isDark) }}

.sideMenu {
  size: 14;
}
```

:::

As you can see, this is done by passing a React component to the `sideMenu` prop of `SideMenuPositioner`. Each `Positioner` element has a prop through which you can pass the component you want to render (`formattingToolbar` for the Formatting Toolbar, etc.). If nothing is passed, the `Positioner` will render the default UI element.

