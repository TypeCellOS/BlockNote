
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

One approach for this would be for y-prosemirror to provide the `y-diff` between two documents as a list of modifications, which can then be interpreted by another program to choose how to display or render those sets of changes. This de-couples the responsibility of showing the changes in the editor, from the responsibility of viewing, accepting or rejecting those changes.
