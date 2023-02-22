# Introduction to Blocks

This page will explain all about blocks:

- what are blocks
- how to get the "document"?
- example block
- explain fields in blocks

## BlockNote Editor API

BlockNote offers a way to interact with the editor programmatically using the BlockNote editor API. With it, you can access and manipulate blocks inside the editor by calling functions of the API.

**TODO** To access the API...

## Block Objects

BlockNote is centered around the idea of blocks, each containing an individual piece of content and optionally also containing nested blocks. This design philosophy extends to the BlockNote API, which uses the `Block` object type to represent blocks in code.

Most functions in the BlockNote API either return `Block` objects or take them as arguments, so it's important to familiarize yourself with them in order to best make use of it. You can find all the functions available in the BlockNote API in **TODO** Manipulating Blocks. 

```
type Block = {
    id: string | null;
    type: string;
    props: Record<string, string>;
    textContent: string;
    styledTextContent: StyledText[];
    children: Block[];
}
```

`id:` The block's ID. Multiple blocks cannot share a single ID, and block will keep the same ID from when it's created until it's removed.

`type:` The block's type, which determines several things. One of these, is the kind of content that the block contains, such as a paragraph, heading, or image. The type also establishes what properties the block can have, and affects the block's appearance as well as behaviour in the editor. It's important to note that nested blocks do not inherit their parent blocks' type, and you can find a list of all default types in **TODO** Block Types.

`props:` The block's properties, which are a set of key/value pairs that further modify its appearance or behaviour alongside its type. This means that the properties that a block can have are also entirely determined by its type. You can find more information on which properties each type of block has in **TODO** Block Types.

`textContent:` The block's content, represented as plain text. This does not include content from any nested blocks.

`styledTextContent:` The block's content, represented as an array of StyledText objects. It contains not only a plain text information regarding the block's contents, but also the inline styles applied, such as bold, italic, and text color. Like `textContent`, this doesn't include content from nested blocks. For more information on StyledText objects, visit **TODO** Rich Text Content.

`children:` Any blocks nested inside the block. The nested blocks are also represented using Block objects.



## Getting Familiar with Block Objects

Now that we know how blocks are represented in the BlockNote API, take a look at the live example below. We have a BlockNote editor, under which we display its contents using an array of `Block` objects. Feel free to play around to get a better feel for how blocks look in the editor, compared to how they're represented using `Block` objects.

**TODO** Live example.