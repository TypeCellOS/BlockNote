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

