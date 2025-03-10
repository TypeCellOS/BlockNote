
# Diff two Y.js snapshots

Y.js keeps track of metadata around what changes have been made to a document in order to efficiently synchronize changes. So, to compare a document with it's previous version, you can leverage this metadata by taking a snapshot of the full history of a document, and compare the insertions and deletions that have been made between the two snapshots. Because they share history, you can figure out what has been modified from _this point_ in history compared to _that point_ in history. For clarity, let's call this a `y-diff` for now to make sure it is different than a full content diff.

## Changes as _attributes_

Kevin has already implemented a preliminary version of the `y-diff` between two documents. Specifically, by using `ychange` attributes to add metadata onto elements to indicate whether they were modified between the two versions. This approach works for simple documents at the moment, with some limitations around:

- Certain features are missing (due to this being preliminary work) like
  - XYZ
- Controlling the display of the diff:
  - y-prosemirror is controlling how the diffs are rendered so doing something like a stacked diff would not be possible
  - Trying to simplify changes to a more human understandable version as described in the HTML diffing section would not be possible, since y-prosemirror directly writes the changes it finds to elements
- Inability to edit content while displaying diffs
  - For something like suggestions to work in the future, there needs to be a way to modify the document & still present the suggestions that have been made

## Changes as _marks_

Another approach, would be to model what is currently being represented as attributes, but instead use marks similar to [`@handlewithcare/prosemirror-suggest-changes`'s schema](https://github.com/handlewithcarecollective/prosemirror-suggest-changes?tab=readme-ov-file#schema) where the content changes are represented as marks. This would allow flexibility in display (because of support for [markviews](https://prosemirror.net/docs/ref/#view.MarkView) which can decouple content from presentation).

Though, I question whether it _should_ be the responsibility of `y-prosemirror` to be both finding the difference and modifying the content of the document to display those differences. It feels like `y-prosemirror` should be scoped to the integration of yjs & prosemirror, and this is somewhat out of scope for it. I would be okay with `y-prosemirror` providing utilities to find the `y-diff` between documents in the y-prosemirror format, but the responsibility of how that integrates with prosemirror should be the responsibility of the caller of that function, rather than, built into the `y-sync` plugin.

## Changes as a _list of diffs_

One approach for this would be for y-prosemirror to provide the `y-diff` between two documents as a list of modifications, which can then be interpreted by another program to choose how to display or render those sets of changes. This is similar in approach to the snapshot compare extension that I implemented.

This is non-trivial, because the shape of the document is nested and almost arbitrary. Difficult, but doable - this is exactly the sort of approach that [Snapshot Compare feature](https://tiptap.dev/docs/collaboration/documents/snapshot-compare#page-title) works on. It diffs two snapshots of Y.js documents, and is able to create a list of diffs between them, which can be displayed within the editor content. But, this feature is view-only, how would we be able to apply only specific segments?

> Also, it is worth noting that this feature not only did the diff based on the document content, but actually by diffing the Y.js data structure itself, to attribute specific changes to specific users.

There is a neat little trick in how these diffs are generated, it was to not just a list of changes, but actually as granular Prosemirror steps. Why do it like this? This means, that to apply only a single diff, would be as easy as applying only a single step of a transform! I never actually got around to implementing that part of the feature for time constraints, but that should 'just work' ™. Another nice property of this, is that, theoretically, you could also replace `y-sync` to do diffs with the new update that came in and have granular updates to a prosemirror document, which gives a much nicer experience for prosemirror devs whose plugins do not have to be aware of Yjs replacing the document content on each update.
