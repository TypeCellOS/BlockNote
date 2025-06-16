# Document Transforms

A core part of the BlockNote API is the ability to make changes to the document, using BlockNote's core design of blocks, this is much easier to do programmatically than with other editors.

We've done pretty well with our existing API, but there are a few things that could be improved.

Referencing content within the document is either awkward or non-existent. Right now we essentially really only have an API for referencing blocks by their id with no further level of granularity.

## Locations

[Looking at Slate](https://docs.slatejs.org/concepts/03-locations) (highly recommend reading the docs), they have the concept of a `Location` which is a way to reference a specific point in the document, but it does not have to be so specific as positions, it has levels of granularity.

This gives us a unified way to reference content within the document, allowing for much more granular editing. Take a look at the `Location.ts` file for more details around this.

## Transforms separation of concerns

Right now all transformation functions are defined directly on the `Editor` instance, this is not ideal because it only further muddles the API.

Instead, we should have a separate `Transform` class which defines methods that operate on the editor's document to make changes to it. This will also be very useful for doing server-side transformations.

```ts
editor.transform.insertBlocks(ctx:{
  at: Location,
  blocks: Block | Block[]
});

editor.transform.replaceBlocks(ctx: {
  at: Location,
  with: Block | Block[]
})

editor.transform.replaceContent(ctx: {
  at: Location,
  with: InlineContent | InlineContent[]
})

editor.transform.deleteContent(ctx: {
  at: Location,
})
```

## References

Currently, we do not have a good way to reference things about content within a document, except by block id. With Locations, we can be much more granular & more powerful.

I think one application of this would be to introduce the concept of "references" to content within a document. For example, we currently do not store comments into the blocknote json, taking the position that it really is not part of the document, but rather metadata about the document.

With references, we could store comments with references to the blocks that they are about. And map those references through changes if they are ever modified. For example, if someone commented on the text within block id `123`, and then the block was moved to a new location, we could update the comment to reference the new block id.

So, this would allow a comment to still be a separate entity, but be able to "hydrate" within the editor and keep track of the content that it was about.

```ts
type Reference<Metadata extends Record<string, any>> = {
  to: Location,
  metadata: Metadata
}

type Comment = Reference<{
  threadId: string
}>

editor.references.add(reference: Reference, onUpdate: (reference: Reference) => void);
```

This is inspired by [bluesky's concept of facets for rich text content](https://docs.bsky.app/docs/advanced-guides/post-richtext) which is a great example of how to make block note content more inter-operable between different applications.
