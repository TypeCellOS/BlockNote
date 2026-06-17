---
name: debug-skill
description: Instructions for navigating and debugging BlockNote in a browser. Shows how to open specific menus & toolbars, as well select content. Should be used when prompted to fix a bug that requires inspecting the editor's appearance or rendered HTML.
---

# General loop

When fixing a bug, the following feedback loop should be used.

1. Apply a code change that you think will fix the issue.
2. Test the change in a browser environment.
3. Take screenshots to verify that the issue is fixed.
4. Repeat until the bug is indeed fixed.

# Browser environment

Before starting up a browser environment, you need to ensure the dev server is running. This can be done by checking if port 5173 is in use. If it isn't, running `vp run dev` at the project root will start the server.

The Playwright CLI should be used for the browser environment. It can be used to navigate to the dev server and programmatically issue mouse clicks/keyboard inputs. If not installed, stop what you're doing and notify the user to install it.

# Selecting an example

After navigating to `localhost:5173`, an example must be selected. These are listed in the navbar (`mantine-AppShell-navbar` CSS class). The "Default Schema Showcase" should be selected, unless stated otherwise by the user.

Each example will contain a BlockNote editor, and possibly additional elements like text fields or static toolbars.

# Editor HTML structure

Below is a list of elements that make up a BlockNote editor. This is helpful for mapping BlockNote concepts to what's actually visible in the browser. The nesting of the list items is representative of how the corresponding elements are nested in the rendered HTML. The elements are referenced by their main CSS class.

- `bn-container`: Wrapper element for the editor.
  - `bn-editor`: Root element for the BlockNote editor.
    - `bn-block-group`: Root container for blocks.
      - `bn-block-outer`: Wrapper element for a block.
        - `bn-block`: Root element for a block.
          - `bn-block-content`: Container element for all content rendered by the block itself. Also renders a `data-content-type` attribute which stores the block's type, and additional `data-*` for every non-default prop that the block has.
            - `bn-inline-content`: Container element for user-editable rich text within a block. Note that not all blocks will contain this element.
          - `bn-block-group`: Container for nested blocks. Note that if a block doesn't contain nested blocks, it won't have this element.
      - `bn-block-column-list`: Container element for columns.
        - `bn-block-column`: Column element containing blocks.

Each element only appears once in its parent, except `bn-block-outer` and `bn-block-column-list`, which can appear multiple times.

Each `bn-block-group` and `bn-block-column` also contain `bn-block-outer` elements. These are not listed as they can be nested to an arbitrary depth.

Note that additional UI elements like menus and toolbars are mounted in a portal attached to the `body`.

# Keyboard navigation

Assume you are on a machine running macOS. You can use the following key combinations to navigate through the editor and create selections:

- Left/Right Arrow: Moves the text cursor back/forward one character.
- Up/Down Arrow: Moves the text cursor to the previous/next block.
- Option + Left/Right Arrow: Moves the text cursor to the start/end of the current word. If already at the start/end of a word, moves it to the start/end of the previous/next one instead.
- Cmd + Left/Right Arrow: Moves the text cursor to the start/end of the line.
- Cmd + Up/Down Arrow: Moves the text cursor to the start/end of the document.

Each of these can also be used with Shift to create/extend a selection instead of just moving the cursor.

It is extremely important to note that these key combinations are only relevant for debugging and NOT for writing end-to-end tests. While Playwright is used for both, tests run in a Linux environment which has different bindings for keyboard navigation.

# Opening menus & toolbars

Here are the most often used UI elements, and how to find/open them.

- **Formatting toolbar**: Create a selection using the keyboard and look for an element with the `bn-formatting-toolbar` CSS class. Buttons/dropdowns within it should be interacted with using the mouse instead. The `data-test` attribute will inform you what a given button or dropdown is for. Press escape to dismiss the toolbar.
- **Side menu**: Hover a block with the mouse, i.e. a `bn-block` element, and look for an element with the `bn-side-menu` CSS class. Unless specified otherwise, it contains a button to add a block ("Add block" ARIA label) and a drag handle which opens a menu on click ("Open block menu" ARIA label). Typing in the editor or moving the mouse cursor above/below it will hide the side menu, unless the drag handle menu is open. Then, it's "frozen" until dismissed by an outside click or pressing Escape.
- **Slash menu**: Type the "/" key while in a block and look for an element with the `bn-suggestion-menu` CSS class. It contains a list of items with the `bn-suggestion-menu-item` CSS class. While the menu is open, the up/down arrows navigate through items instead of moving the text cursor. Items can be triggered with a mouse click or pressing Enter while selected. Each item will convert the type of the current block to one of a given type, if it's empty. Otherwise, it will create a new block below with that type. The `bn-suggestion-menu-item-title` element's text content will indicate the new type. Pressing Escape closes the menu.
- **Link toolbar**: Hover a link in a block (anchor element within a `bn-inline-content` element), or move the text selection inside it using the arrow keys, and look for an element with the `bn-link-toolbar` CSS class. Unless specified otherwise, it contains three buttons. The first has the text, "Edit link". On click, it opens a popup to edit the link text and URL. You can locate these inputs with the "Edit title" and "Edit URL" placeholders. The other two buttons are for opening the link in a new tab ("Open in new tab" ARIA label) and deleting the link ("Remove link" ARIA label). If the toolbar was opened via mouse hover, moving the mouse off of the link or toolbar will close it after half a second. Otherwise, moving the text cursor outside the link will close the toolbar. It can also be dismissed by pressing Escape.
- **File panel**: After creating a file, image, video, or audio block, it will render a button with the text "Add file" (`bn-add-file-button` CSS class). Clicking the button will open the file panel. When the block is created using the slash menu (typically the case), the file panel will be open immediately. It always has an "Embed" tab (`data-test="embed-tab"` attribute). While this tab is selected, the file panel displays an input for the file URL ("Enter URL" placeholder) and "Embed file" button. For some examples, an "Upload" tab (`data-test="upload-tab"` attribute) will also be present. While it's selected, the file panel will display a file input (`data-test="upload-input"` attribute). After embedding/uploading a file, the block will render said file instead of displaying the "Add file" button.
