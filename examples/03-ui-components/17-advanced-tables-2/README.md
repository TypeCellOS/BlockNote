# Advanced Tables with Calculated Columns

This example demonstrates advanced table features including automatic calculations. It shows how to create a table with calculated columns that automatically update when values change.

## Features

- **Automatic Calculations**: Quantity × Price = Total for each row
- **Grand Total**: Automatically calculated sum of all totals
- **Real-time Updates**: Calculations update immediately when you change quantity or price values
- **Split cells**: Merge and split table cells
- **Cell background color**: Color individual cells
- **Cell text color**: Change text color in cells
- **Table row and column headers**: Use headers for better organization

## How It Works

The example uses the `onChange` event listener to detect when table content changes. When a table is updated, it automatically:

1. Extracts quantity and price values from each data row
2. Calculates the total (quantity × price) for each row
3. Updates the total column with the calculated values
4. Calculates and updates the grand total

## Code Highlights

```typescript
// Listen for changes and update calculations
useEffect(() => {
  const cleanup = editor.onChange((editor, { getChanges }) => {
    const changes = getChanges();

    changes.forEach((change) => {
      if (change.type === "update" && change.block.type === "table") {
        const updatedRows = calculateTableTotals(change.block);
        if (updatedRows) {
          editor.updateBlock(change.block, {
            type: "table",
            content: {
              ...change.block.content,
              rows: updatedRows,
            },
          });
        }
      }
    });
  });

  return cleanup;
}, [editor]);
```

**Relevant Docs:**

- [Tables](/docs/features/blocks/tables)
- [Editor Setup](/docs/getting-started/editor-setup)
- [Events](/docs/reference/editor/events)
