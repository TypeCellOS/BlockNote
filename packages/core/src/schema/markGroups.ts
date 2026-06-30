/**
 * ProseMirror mark group for "non-formatting" marks: comments and
 * suggestion/diff marks (`insertion`/`deletion`/`modification`). These annotate
 * content without representing inline formatting and are ignored by BlockNote's
 * content model (`blocknoteIgnore`).
 *
 * They are the only marks allowed on `"plain"` blocks (e.g. code blocks), which
 * otherwise disallow all marks. A block references this group rather than the
 * individual marks because the comment mark is only present when comments are
 * configured — and the always-present suggestion marks keep the group non-empty
 * so the reference never resolves to an unknown mark/group.
 */
export const NON_FORMATTING_MARK_GROUP = "annotation";
