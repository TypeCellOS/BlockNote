# Inline Content

This page will explain:

- what rich-text is
- what the structure (type) looks like
- default styles
- examples

An array of `InlineContent` objects are used to describe and order content inside blocks. The base definition for `InlineContent` objects is simple as different types of inline content add their own keys:

```typescript
type InlineContent = {
  type: string;
}
```

`type:` The type of the inline content.

## Built-In Inline Content Types

BlockNote includes a number of built-in inline content types to represent different kinds of content. You can see the full list of these below:

### Styled Text

Styled text is used to display pieces of text with markup, or styling, and is defined using a `StyledText` object:

```typescript
type Styles = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  textColor: string;
  backgroundColor: string;
}

type StyledText = {
  type: "text";
  text: string;
  styles: Styles;
}
```

`text:` A piece of text that should be displayed.

`styles:` An object containing the markup/styling that should be applied to the text.

### Links

Links are used to create clickable hyperlinks that go to some URL, and are made up of pieces of styled text. They're defined using `Link` objects:

```typescript
type Link = {
  type: "link";
  content: StyledText[];
  href: string;
}
```

`content:` The styled text that should be used to display the link.

`href:` The URL that should be opened when clicking the link.