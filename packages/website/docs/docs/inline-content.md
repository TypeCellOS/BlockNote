# Inline Content

An array of `InlineContent` objects is used to describe the rich text content inside a block. Inline content can either be styled text or a link, and we'll go over both these in the next section.

## Styled Text

Styled text is used to display pieces of text with markup, or styling, and is defined using a `StyledText` object:

```typescript
type Styles = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  textColor: string;
  backgroundColor: string;
};

type StyledText = {
  type: "text";
  text: string;
  styles: Styles;
};
```

`text:` The text that should be displayed with the markup in `styles`.

`styles:` An object containing the markup/styling that should be applied to the text.

## Links

Links are used to create clickable hyperlinks that go to some URL, and are made up of pieces of styled text. They're defined using `Link` objects:

```typescript
type Link = {
  type: "link";
  content: StyledText[];
  href: string;
};
```

`content:` The Styled Text that should be used to display the link.

`href:` The URL that should be opened when clicking the link.
