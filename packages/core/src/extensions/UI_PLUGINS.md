# UI Plugins to refactor

These are the plugins that are the main target for refactoring. The goal is to reduce complexity by only storing the minimal state needed to render the UI element, & everything else to be derived from that state or moved into the UI layer (React). The main reason for needing to store any state at all is to allow different parts of the UI to be updated independently, like one menu being able to open another menu.

- FilePanel
  - `blockId`: the id of the block that the file panel is associated with
- FormattingToolbar
  - `show`: whether the formatting toolbar is shown
  - `.getReferencePos()`: based on the bounding box of the selection
- LinkToolbar
  - State-driven only React now
- SideMenu
  - `show`: whether the side menu is shown
- TableHandles
  - decorations
  - `draggingState`: the state of the dragging operation
- SuggestionMenu
  - decorations
  - `query`: the current query string for the suggestion menu

## Plan

- Move most plugin state from plugin views into react
  - If that is not possible, move into an extension which has a tanstack store
- Migrate things to use `useEditorState` which is a hook with a better pattern for selecting the correct parts of the editor state that we are interested in
- Move plugins managing menus into floating UI hooks & React
  - If it is a UI state, it should be in React
    - Examples: menu position, menu open/close, etc.
  - If it is an editor state, or accessible across plugins, it should be in an extension
    - Examples: active blocks, exposing methods, etc.

<!-- ## How to execute the plan

### Phase 1: Refactor plugin state

Reduce derived state, and move anything UI state into React. -->
