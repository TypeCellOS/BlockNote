# In-Memory Versioning

This example shows how to use `InMemoryVersioningExtension` without a collaboration layer. It seeds history with ProseMirror document JSON, which the extension converts to immutable documents using the editor's schema. `initialVersions` also accepts BlockNote JSON as arrays of partial blocks.

The sidebar opens on a document with a few versions already in its history, including an automatic unnamed version, so you can preview them, compare them, rename them, restore them, and try the named-only filter right away. The editor is read-only while the sidebar is open: close it to edit the document, then reopen it with the "History" button.
