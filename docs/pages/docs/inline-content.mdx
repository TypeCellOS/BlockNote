---
title: Inline Content
description: An array of InlineContent objects is used to describe the rich text content inside a block. Inline content can either be styled text or a link, and we'll go over both these in the upcoming sections.
imageTitle: Inline Content
path: /docs/inline-content
---

# Inline Content

## Inline Content Types

An array of `InlineContent` objects is used to describe the rich text content inside a block. Inline content can either be styled text or a link, and we'll go over both these in the upcoming sections.

### Styled Text

Styled text is a type of `InlineContent` used to display pieces of text with styles, and is defined using a `StyledText` object:

```typescript
type StyledText = {
  type: "text";
  text: string;
  styles: Styles;
};
```

`text:` The displayed text.

`styles:` The styles that are applied to the text.

**Styles Object**

`StyledText` supports a variety of styles, including bold, underline, and text color, which are represented using a `Styles` object:

```typescript
type Styles = Partial<{
  bold: true;
  italic: true;
  underline: true;
  strikethrough: true;
  textColor: string;
  backgroundColor: string;
}>;
```

### Links

Links are a type of `InlineContent` used to create clickable hyperlinks that go to some URL, and are made up of `StyledText`. They're defined using `Link` objects:

```typescript
type Link = {
  type: "link";
  content: StyledText[];
  href: string;
};
```

`content:` The styled text used to display the link.

`href:` The URL that opens when clicking the link.

## Table Content

While most blocks use an array of `InlineContent` objects to describe their content, tables are slightly different. They use a single `TableContent` object, which allows each table cell to be represented as an array of `InlineContent` objects instead:


```typescript
type TableContent = {
  type: "tableContent";
  rows: {
    cells: InlineContent[][];
  }[];
};
```

## Editor Functions

While `InlineContent` objects are used to describe a block's content, they can be cumbersome to work with directly. Therefore, BlockNote exposes functions which make it easier to edit block contents.

### Accessing Styles

You can get the styles at the current [Text Cursor Position](/docs/cursor-selections#text-cursor) using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public getActiveStyles(): Styles;
...
}

// Usage
const styles = editor.getActiveStyles();
```

If a [Selection](/docs/cursor-selections#selections) is active, this function returns the active styles at the end of the selection.

### Adding Styles

You can add styles to the currently selected text using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public addStyles(styles: Styles): void;
...
}

// Usage
editor.addStyles({ textColor: "red" });
```

### Removing Styles

You can remove styles from the currently selected text using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public removeStyles(styles: Styles): void;
...
}

// Usage
editor.removeStyles({ bold: true });
```

### Toggling Styles

You can toggle styles on the currently selected text using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public toggleStyles(styles: Styles): void;
...
}

// Usage
editor.toggleStyles({ bold: true, italic: true });
```

### Accessing Selected Text

You can get the currently selected text using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public getSelectedText(): string;
...
}

// Usage
const text = editor.getSelectedText();
```

### Accessing Selected Link

You can get the URL of the link in the current selection the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public getSelectedLink(): string | undefined;
...
}

// Usage
const linkUrl = editor.getSelectedLink();
```

If there are multiple links in the selection, this function only returns the last one's URL. If there are no links, returns `undefined`.

### Creating a Link

You can create a new link using the following function:

```typescript
// Definition
class BlockNoteEditor {
...
  public createLink(url: string, text?: string): void;
...
}

// Usage
editor.createLink("https://www.blocknotejs.org/", "BlockNote");
```

If a [Selection](/docs/cursor-selections#selections) is active, the new link will replace the currently selected content.
