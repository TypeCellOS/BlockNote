import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";
import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to the Drag & Drop Exclusion demo!",
      },
      {
        type: "paragraph",
        content:
          "Try dragging the blocks in the editor - they will work as normal.",
      },
      {
        type: "paragraph",
        content:
          "Now try dragging the colored boxes on the right - they won't interfere with the editor's drag & drop!",
      },
    ],
  });

  const [draggedItems, setDraggedItems] = useState([
    { id: "1", color: "#FF6B6B", label: "Red Item" },
    { id: "2", color: "#4ECDC4", label: "Teal Item" },
    { id: "3", color: "#45B7D1", label: "Blue Item" },
    { id: "4", color: "#FFA07A", label: "Orange Item" },
  ]);

  const [droppedItems, setDroppedItems] = useState<typeof draggedItems>([]);

  const handleDragStart = (
    e: React.DragEvent,
    item: (typeof draggedItems)[0],
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("custom-item", JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("custom-item");
    if (data) {
      const item = JSON.parse(data);
      setDroppedItems((prev) => [...prev, item]);
      setDraggedItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleReset = () => {
    setDraggedItems([
      { id: "1", color: "#FF6B6B", label: "Red Item" },
      { id: "2", color: "#4ECDC4", label: "Teal Item" },
      { id: "3", color: "#45B7D1", label: "Blue Item" },
      { id: "4", color: "#FFA07A", label: "Orange Item" },
    ]);
    setDroppedItems([]);
  };

  return (
    <div className="app-container">
      <div className="editor-section">
        <h2>BlockNote Editor</h2>
        <BlockNoteView editor={editor} />
      </div>

      <div className={`drag-demo-section bn-drag-exclude`}>
        <h2>Separate Drag & Drop Area</h2>
        <p className="info-text">
          This area uses the <code>bn-drag-exclude</code> classname, so dragging
          items here won't interfere with the editor.
        </p>

        <div className="drag-columns">
          <div className="drag-column">
            <h3>Draggable Items</h3>
            <div className="items-container">
              {draggedItems.map((item) => (
                <div
                  key={item.id}
                  className="draggable-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  style={{ backgroundColor: item.color }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div
            className="drag-column drop-zone"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <h3>Drop Zone</h3>
            <div className="items-container">
              {droppedItems.length === 0 ? (
                <p className="placeholder">Drop items here</p>
              ) : (
                droppedItems.map((item) => (
                  <div
                    key={item.id}
                    className="draggable-item"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.label}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button className="reset-button" onClick={handleReset}>
          Reset Items
        </button>
      </div>
    </div>
  );
}
