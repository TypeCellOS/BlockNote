# Drag & Drop Exclusion

This example demonstrates how to use the `DRAG_EXCLUSION_CLASSNAME` to create separate drag & drop areas that don't interfere with BlockNote's built-in block drag & drop functionality.

## Features

- **Drag Exclusion**: Elements with the `bn-drag-exclude` classname are treated as separate drag & drop operations
- **Independent Drag Areas**: Create custom drag & drop functionality alongside BlockNote's editor
- **No Interference**: Custom drag operations won't trigger BlockNote's block reordering
- **Side-by-side Demo**: Shows the editor and custom drag area working independently

## How It Works

By adding the `DRAG_EXCLUSION_CLASSNAME` (`bn-drag-exclude`) to an element, you tell BlockNote's drag & drop handlers to ignore all drag events within that element and its children. This allows you to implement your own custom drag & drop logic without conflicts.

The exclusion check works by traversing up the DOM tree from the drag event target, checking if any ancestor has the exclusion classname. If found, BlockNote's handlers return early, leaving your custom handlers in full control.

## Code Highlights

### Import the constant:

```tsx
import { DRAG_EXCLUSION_CLASSNAME } from "@blocknote/core";
```

### Apply it to your custom drag area:

```tsx
<div className={`drag-demo-section ${DRAG_EXCLUSION_CLASSNAME}`}>
  {/* Your custom drag & drop UI */}
  <div draggable onDragStart={handleDragStart} onDrop={handleDrop}>
    Custom draggable items
  </div>
</div>
```

## Use Cases

- **Custom UI elements**: Add draggable components within or near the editor
- **File upload areas**: Create drag-and-drop file upload zones
- **Sortable lists**: Implement custom sortable lists alongside the editor
- **External integrations**: Integrate with third-party drag & drop libraries

**Relevant Docs:**

- [Drag & Drop](/docs/features/drag-drop)
- [Editor Setup](/docs/getting-started/editor-setup)
