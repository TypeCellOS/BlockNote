# Locations

Before understanding what locations are and how they are helpful, we must first understand the structure of a BlockNote document by it's parts:

```ts
type Text = {
  type: "text";
  text: string;
  styles?: Object;
};

type CustomInlineContent = {
  type: string;
  props: Object;
  content: Text[] | undefined;
};

type Block = {
  id: string;
  type: string;
  props: Object;
  content: (Text | CustomInlineContent)[] | undefined;
  children: Block[] | undefined;
};

type Document = Block[];
```

So, as you can see, the editor's content can be quite layered and nested.

- A document contains blocks
- A block may contain text, or inline content, or be empty altogether
  - A block may also have child blocks (which are visually indented)
- inline content may contain text or be empty altogether

Blocks have identifiers, but inline content & text do not have unique identifiers, so it can be tricky to describe their position within the document. Usually this is done relative to the current text cursor, but there needs to be a better way about this than moving the selection around by offsets.

## Enter Locations

A location is meant to be a generic way of describing a position within a document. It is flexible enough to describe a single position within the document (e.g. in-between two letters anywhere within the document) as well as be flexible enough to represent ranges of positions across the document (e.g. the current selected text). This can occur at different levels of specificity, sometimes you care only about block-level operations (e.g. when updating a block's props), other times you care about character level operations (e.g. inserting a character into the document at a specific position), and still other times you care about ranges of positions (e.g. marking a sentence to be bold).

Locations provide this flexibility by being flexible in their definition like below:

- **BlockId**: block level specificity
  - Technically just a `Point` where the offset is `-1`
- **Point**: character level specificity
  - a pair of a `BlockId` & `offset`
- **Range**: a range of items at character level specificity
  - two points `anchor` & `head`
- **BlockRange**: a range of blocks at block level specificity
  - Technically just two `Range`s, with both of their offsets as `-1`

A `Location` is defined to be any of `BlockId | Point | Range` allowing for varying levels of specificity. In some cases, operations may only operate at the block-level, so passing something of higher specificity will only operate at that level. In other cases, an operation may require a higher-level of specificity and therefore will be required to declare that at the type-level.

## Example

So, that was a lot of explanation, let's see an example to make this concrete. We will start by defining a document like so:

```ts
const document = [
  {
    id: "first-paragraph",
    type: "paragraph",
    props: {},
    content: [
      {
        type: "text",
        text: "abc",
      },
    ],
  },
  {
    id: "second-paragraph",
    type: "paragraph",
    props: {},
    content: [
      {
        type: "text",
        text: "def",
      },
    ],
  },
];
```

Based on this document, we can see different ways of declaring the positions in this document:

```ts
// selects the whole first paragraph
const a = "first-paragraph" satisfies BlockId;

const b = { id: "first-paragraph" } satisfies BlockIdentifier;

const c = { id: "first-paragraph", offset: -1 } satisfies Point;

const d = {
  anchor: { id: "first-paragraph", offset: -1 },
  head: { id: "first-paragraph", offset: -1 },
} satisfies Range;

const e = ["first-paragraph", "first-paragraph"] satisfies BlockRange;

// any of the above satisfies as a `Location`
const f = (a || b || c || d || e) satisfies Location;
```

Whereas, if we want to select the position starting at character 'b' then only these are valid:

```ts
const g = { id: "first-paragraph", offset: 1 } satisfies Point;

const h = {
  anchor: { id: "first-paragraph", offset: 1 },
  head: { id: "first-paragraph", offset: 1 },
} satisfies Range;
```

Or, some other examples:

```ts
// select from character 'b' to character 'c'
const i = {
  anchor: { id: "first-paragraph", offset: 1 },
  head: { id: "first-paragraph", offset: 2 },
} satisfies Range;
// select from character 'b' to character 'e'
const i = {
  anchor: { id: "first-paragraph", offset: 1 },
  head: { id: "second-paragraph", offset: 1 },
} satisfies Range;
// select from first paragraph to the second paragraph
const j = {
  anchor: { id: "first-paragraph", offset: -1 },
  head: { id: "second-paragraph", offset: -1 },
} satisfies Range;
const k = ["first-paragraph", "second-paragraph"] satisfies BlockRange;
```

## Nested content

To interpret nested content, you can imagine Ranges as being inclusive of their children, or exclusive of their children. For example, when out-denting a block with children, you would want that operation to be exclusive of it's children (i.e. only out-dent the parents, not their children), whereas bolding would be inclusive of it's children (i.e. bold should apply to the parent & children selected). As such, this is dependent on the type of operation, not of the `Location` being specified, so methods will need to be clear of their expectations upfront. By default, operations will be **assumed to be _inclusive_ of children**.
