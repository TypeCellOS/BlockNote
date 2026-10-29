# BlockNote server utilities

Process BlockNote documents on the server with `ServerBlockNoteEditor`.

HTML/Markdown operations and React context rendering require an
persistent DOM. Pass `getDocument()` from `@blocknote/server-util/dom`
as the second argument to `ServerBlockNoteEditor.create(options, document)`,
or provide a document from another compatible implementation. Share one
document across editors. If omitted, the editor uses the global DOM. Imports
do not install globals, and the main entry point does not load JSDOM. JSON,
ProseMirror, and Yjs conversions need no DOM setup.

See [server-side processing](https://www.blocknotejs.org/docs/features/server-processing)
for setup, React context, concurrency, and worker isolation.
