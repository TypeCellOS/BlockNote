# Local Storage Versioning (Yjs v13, Experimental)

This experimental playground example shows how to use the `VersioningExtension` with collaborative editing using Yjs v13. Snapshots are stored in localStorage using Yjs state updates.

The sidebar opens on a document with a few versions already in its history. You can preview, rename, and restore a version. Restoring replaces the live document content and saves the previous content as a "Backup" version. Comparison is not supported. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button and name the current version to save it.

**Relevant Docs:**

- [Editor Setup](/docs/getting-started/editor-setup)
- [Real-time collaboration](/docs/features/collaboration)
