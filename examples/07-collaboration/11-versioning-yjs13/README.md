# Local Storage Versioning (Yjs v13, Experimental)

This experimental playground example shows how to use `YjsVersioningExtension` with collaborative editing using Yjs v13. Snapshots are stored in localStorage using Yjs state updates.

The sidebar opens on a document with a few versions already in its history. You can preview, compare, rename, and restore a version. `DiffVersioningExtension` highlights insertions and deletions when comparing versions. It uses Yjs v14 internally for rendering, while the live collaborative document stays on Yjs v13. Diffs show content changes, not their original authors. Restoring replaces the live document content and saves the previous content as a "Backup" version. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button and name the current version to save it.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Real-time collaboration](/docs/features/collaboration)
