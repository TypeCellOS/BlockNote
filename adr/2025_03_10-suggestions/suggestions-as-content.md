# Storing changes as _content_ within the document

Another way to represent changes to content is actually to embed markers of where the change was made directly into the content. This is actually how Microsoft Office implements their [Tracked Changes feature](https://www.oxygenxml.com/doc/versions/27.0/ug-editor/topics/author-managing-changes.html), which should give you an idea of the viability of such an approach. By storing the changes directly in the document, you have flexibility on whether to display the changes, and accept or reject them, since all states are present already in the document content.

## Implementation details

This would introduce 3 new marks for content in the editor, `insertion`s `deletion`s and `modification`s. When entering suggestion mode:

- a change which would normally result in a deletion is instead marking that content with the `deletion` mark
- an insertion would both insert the new content, but also wrap it with a `insertion` mark
- any change to attributes would mark the content with a `modification`
There will be additional metadata that could be tracked as attributes to these marks too, such as timestamp, or even a reference to a comment.

## Pros

- [There is prior art](https://github.com/handlewithcarecollective/prosemirror-suggest-changes) that we can leverage (and [this one](https://github.com/Atypon-OpenSource/manuscripts-track-changes-plugin) and [this one](https://github.com/davefowler/prosemirror-suggestion-mode/) and [this one](https://gitlab.coko.foundation/wax/wax-prosemirror/-/blob/master/wax-prosemirror-core/src/utilities/track-changes/trackedTransaction.js?ref_type=heads))
- Importing from something like DOCX, would be a 1-1 mapping as you can just map the DOCX insertions and deletions to our equivalents

## Cons

The main tradeoff of this approach is around permissions (e.g. a suggestion-only user), at least without resorting to some server-side inspection of content changes (like comments). Theoretically, to get around this, you could use cryptography to sign the content of these changes to ensure that they have not been tampered with across editors, but a suggestion user would still have enough permissions to write into the document when they should not be able to.

- Adds complexity to displaying content in the editor, may need to rely on things like decorations to hide content we do not want to display
- Since it is not a separate document, the permissions have to be the same as having write permissions to the document
