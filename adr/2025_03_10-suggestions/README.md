# Versioning & Suggestions

Due to the similarity between document versioning, red lining, track changes and suggestions, it is worth seeing an overview of all of their requirements to make sure we consider solutions that resolve multiple of them.

- A diff between two versions of a document, is essentially a set of suggestions that takes your previous document, and transforms it into the more recent document.
- Red-lining and suggestions are the same, red-lining just allows you to attach metadata to the suggestion, like a comment of why the change was made.
- Track changes, is entering a mode where any edit you make, becomes a suggestion to the document.

## Versioning Overview

Versioning has already been implemented for Y.js & y-prosemirror, but to be explicit about the sort of thing we are looking for it is good to explicitly state the feature set versioning should have:

- A user can take _snapshots_ of the current document state, and store that in a separate data store
- These snapshots can be viewed independently at any point in time later
- These snapshots can be _compared_ with each other
  - This allows the user to see what changed between the two snapshots
  - Changes should show:
    - The content that was changed (i.e. additions or deletions)
    - Updates to content (i.e. changing an attribute)
    - Which user identifiers modified the content
    - Ideally, a timestamp of when the content was modified
    - Changes should only show content that was present in both documents (i.e. if some content was added and subsequently deleted in some version between the two snapshots, because it is not present in the final document of either snapshot, it should not show)
  - These changes can be visualized in a number of ways: as a unified diff, split diff, or even stacked diff. _See [Appendix](#displaying-changes) for more information_

**Prior Art:**

- Google Docs [Video here]

### Suggestions Overview

Suggestions are the ability to make changes to a document and have those changes tracked separately from the document content. This allows modifications to the document in a way that can be audited, and either approved or rejected by another party.

- A user can turn on a mode, suggestion mode, which makes all of their edits to a document be tracked, but stored separately from the document itself.
  - The original document should be unmodified when suggestion mode is turned back off.
  - If in suggestion mode, and the user has write access to the document, they should be able to make changes to the document without having to leave suggestion mode. Such as applying a suggestion to the document.
- These stored changes, can be reviewed, and either approved or rejected separately.
  - Approving a suggestion should apply the change to the document, Rejecting should drop that suggestion
- A suggestion may become "invalid" if the document that the change has been modified in a way that the change can no longer be applied (e.g. an insertion into a deleted paragraph, or a deletion of an already deleted paragraph)
- A suggestion should store:
  - The content of the suggestion based on the type of suggestion
  - **insertions:** where to insert the change, the content to insert
  - **deletions:** where to delete the content, the content to be deleted
  - **updates:** where to update the content, what key to update, what value to set the key to
  - A timestamp of when the suggestion was proposed
  - Which user proposed the suggestion
  - An optional thread identifier, for discussion around why the change was made

**Prior Art:**

- Google Docs: [video here]

### Similarities

Versioning and suggestions have quite a bit of overlap between them, they both rely on having a set of changes which store:

- user: who made the change (the change's attribution)
- timestamp: of when the change was made
- content: what changed & it's location in the document

Ideally, we could re-use some of the logic and data structures between them for both features, since they overlap in representation and visualization to users.

## What we need to decide

### How should Y.js snapshots be compared

Y.js already has versioning in the form of snapshots of the Y.js document, at a point in time. In Y.js, the snapshots have the nice property of having some form of a history associated to those edits. To figure out what changed, you could calculate a diff between the two histories of the document. Doing a comparison based on the document content alone, would not meet our requirement of being able to display who made the change and when. Luckily, in Y.js, there is additional metadata that we can extract from Y.js which can tell us which `clientID` made the change (`clientID` being an ID a user assumes when making edits to a document). More on how to calculate that diff here: [Diff two Y.js Snapshots](./diff-yjs-snapshots.md)

This would be the most straightforward way to capture changes across versions of a document. The question then becomes how to display those changes within a prosemirror-based editor, which sort of depends on the approach taken for suggestions.

### How should suggestions be stored

Suggestions are different from versioning in that, they are not a history of the document, but a set of pending changes that can be applied to the document. They may be rejected, or may be applied to the document. So, in a sense, they are a patch to the document. But, there are a few different mental models we can use to represent or store these changes to the document:

- [Seeing a suggestion as a _branch of the document history_, and the suggestion as being the diff between the two branches](./suggestions-as-history.md)
- [Storing document _patches_ and later applying that patch to a document](./suggestions-as-patches.md)
- [Suggestions as _document content_ which stores the changes within the document](./suggestions-as-content.md)

### AttributionManager

Currently, Y.js has been using a `PermanentUserData` class to keep track and store the `clientID`s that a specific user has used previously. Kevin has some ideas on an improved system for this, which he can elaborate on in detail, later. This will be crucial to how we can attribute users in prior versions of the document.

If I were to share my wish-list for features this should have, it would be able to answer questions like:

- Given a `clientID`, what `userID` made this change?
- At what time was this `clientID` first used?
  - This gives approximate times for attributing content to a time, without having to store an additional timestamp per change).
  - Most people don't need the specific time, they just want to know relative time "Is this days, months or years old?"
  - Auditing should be done at a different level, and not in a user writable data structure like a YDoc

I'd like to have Kevin give more details on the sort of features/properties we can expect from this. It will be a crucial feature to the implementation, and likely to be worked on first since it will be foundational to how the versioning works.

## Summary

This document was purposefully written from the perspective that Y.js is one of many document storage and synchronization mechanisms. And, we would like to keep our editor de-coupled from these specific implementation details as much as possible to encourage code re-use between different implementations.

## Appendix

This is a collection of scattered thoughts on the _diff_-erent aspects of diffing  (sorry, had to), and their complications.

### Keeping user intent, while diffing

Diffing nested data structures (e.g. HTML) is fundamentally different than diffing by the semantics of a document. This, is probably best described in an example:

Take the following document:

```html
<p>Some text</p>
<p>More text</p>
```

Let's say that the user deletes the range of text from "text" and collapses the two paragraphs into 1 paragraph, resulting in this document:

```html
<p>Some More text<p>
```

If we examine the changes, this is actually multiple operations:

- deletion of the word "text"
- insertion of the words "More text" at the position where "text" was
- deletion of 2nd paragraph

If we were to represent this change using HTML elements it was meant to look like this:

```html
<p>Some <del>text<p>
<p></del>More text</p>
```

Yet, a diff would represent it like this:

```html
<p>Some <del>text</del><ins>More text</ins></p>
<del><p>More text</p></del>
```

They ultimately result in the same in the final document but, the difference is in their semantics and user expectations. There are probably ways to simplify these changes in such a way that it is closer to what the user actually intended with the change (e.g. Prosemirror's [simplifyChanges](https://github.com/ProseMirror/prosemirror-changeset)), but it gets complicated rather quickly and we have to face that it may not always be easy to represent/display.

Whatever the approach, we need to make sure that the changes are displayed in a way that is easy to understand and aligns with the user's intent.

### Displaying changes

There are actually a few different ways to display changes in a document. Above, I was describing changes in what is called a _unified diff_. where changes are inter-leaved into the document using inline content and markers for where the inserted and deleted content exists. But, that is just one way to display a diff, you can also display diffs using a _split diff_ like so:

```txt
❯ delta a b 
1/a ⟶   2/b
──────────────────────────────────────────────────────

───┐
1: │
───┘
│  1 │<p>Some text</p>     │    │
│  2 │<p>More text</p>     │    │
│    │                     │  1 │<p>Some More text</p>
```

And, there is _stacked diffs_, too!

```txt
❯ diff a b   
1,2c1
< <p>Some text</p>
< <p>More text</p>
\ No newline at end of file
---
> <p>Some More text</p>
\ No newline at end of file
```

The nice thing about these different ways of displaying diffs, is that they are better at representing certain kinds of changes (especially when they are colorized unlike these examples). For example, for block-level changes, the unified diff seems to capture this change the best, it becomes clear that two lines became one.

So, there are multiple ways to display diffs, and they can be advantageous in different situations. Ideally, our solution would have flexibility in displaying changes in any of these ways.

> As a matter of practicality, we are also looking into using these different ways of displaying diffs for things like displaying LLM responses, like if an LLM were to rewrite some content, it could display in a split diff view to show the changes the LLM actually made. So, this is not just a theoretical want, but something we would want to build this year.
