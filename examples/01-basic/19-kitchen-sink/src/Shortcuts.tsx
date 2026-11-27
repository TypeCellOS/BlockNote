const shortcuts = [
  ["Paragraph", "Mod+Alt+0", ""],
  ["Heading 1–6", "Mod+Alt+1–6", "# , ## , ### , … at block start"],
  ["Quote", "Mod+Alt+Q", "> at block start, followed by Space"],
  [
    "Bulleted list",
    "Mod+Shift+8",
    "- , + , or * at block start, followed by Space",
  ],
  [
    "Numbered list",
    "Mod+Shift+7",
    "1. , 2. , … at block start, followed by Space",
  ],
  [
    "Checklist",
    "Mod+Shift+9",
    "[] , [ ] , [x] , or [X] at block start, followed by Space",
  ],
  ["Toggle list", "Mod+Shift+6", ""],
  ["Code block", "Mod+Alt+C", "``` or ```js at block start, followed by Space"],
  ["Math equation", "", "$$ or \\[ at block start, followed by Space"],
  ["Bold", "Mod+B", "**text** or __text__"],
  ["Italic", "Mod+I", "*text* or _text_"],
  ["Underline", "Mod+U", ""],
  ["Strikethrough", "Mod+Shift+S", "~~text~~"],
  ["Inline code", "Mod+E", "`text`"],
  ["Link", "Mod+K with selected text", ""],
  ["Inline math", "", "$equation$ or \\(equation\\)"],
  ["Undo", "Mod+Z", ""],
  ["Redo", "Mod+Shift+Z or Mod+Y", ""],
  ["Copy / cut / paste", "Mod+C / Mod+X / Mod+V", ""],
  ["Select all", "Mod+A", ""],
  ["Create a block", "Enter", ""],
  ["Insert a line break", "Shift+Enter", ""],
  ["Move blocks up / down", "Mod+Shift+Up / Down Arrow", ""],
  ["Nest / unnest blocks", "Tab / Shift+Tab", ""],
  ["Slash menu", "/", ""],
  ["Emoji picker", ": followed by at least two search characters", ""],
  ["Focus / close formatting toolbar", "Tab / Escape after selecting text", ""],
  [
    "Submit comment",
    "Mod+Enter (or Enter by default)",
    "Shift+Enter inserts a line break",
  ],
];

export function Shortcuts() {
  return (
    <details className="kitchen-sink-shortcuts">
      <summary className="kitchen-sink-shortcuts-summary">
        Keyboard shortcuts
      </summary>
      <p className="kitchen-sink-shortcuts-help">
        Mod means Command on macOS and Control on Windows/Linux. Input patterns
        are typed into the editor.
      </p>
      <div className="kitchen-sink-shortcuts-table-scroll">
        <table className="kitchen-sink-shortcuts-table">
          <caption>Editor keyboard shortcuts</caption>
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Shortcut</th>
              <th scope="col">Input pattern</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map(([action, shortcut, pattern]) => (
              <tr key={action}>
                <th scope="row">{action}</th>
                <td>{shortcut || "—"}</td>
                <td>{pattern || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
