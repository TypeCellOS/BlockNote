import { InputRule } from "@tiptap/core";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../../schema";
import { createDefaultBlockDOMOutputSpec } from "../../defaultBlockHelpers";
import { defaultProps } from "../../defaultProps";
import { handleEnter } from "../ListItemKeyboardShortcuts";
import { getCurrentBlockContentType } from "../../../api/getCurrentBlockContentType";

export const checkListItemPropSchema = {
  ...defaultProps,
  checked: {
    default: false,
  },
} satisfies PropSchema;

const checkListItemBlockContent = createStronglyTypedTiptapNode({
  name: "checkListItem",
  content: "inline*",
  group: "blockContent",
  addAttributes() {
    return {
      checked: {
        default: false,
        // instead of "checked" attributes, use "data-checked"
        parseHTML: (element) =>
          element.getAttribute("data-checked") === "true" || undefined,
        renderHTML: (attributes) => {
          return attributes.checked
            ? {
                "data-checked": (attributes.checked as boolean).toString(),
              }
            : {};
        },
      },
    };
  },

  addInputRules() {
    return [
      // Creates a checklist when starting with "[]" or "[X]".
      new InputRule({
        find: new RegExp(`\\[\\s*\\]\\s$`),
        handler: ({ state, chain, range }) => {
          if (getCurrentBlockContentType(this.editor) !== "inline*") {
            return;
          }

          chain()
            .BNUpdateBlock(state.selection.from, {
              type: "checkListItem",
              props: {
                checked: false as any,
              },
            })
            // Removes the characters used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
      new InputRule({
        find: new RegExp(`\\[[Xx]\\]\\s$`),
        handler: ({ state, chain, range }) => {
          if (getCurrentBlockContentType(this.editor) !== "inline*") {
            return;
          }

          chain()
            .BNUpdateBlock(state.selection.from, {
              type: "checkListItem",
              props: {
                checked: true as any,
              },
            })
            // Removes the characters used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => handleEnter(this.editor),
      "Mod-Shift-9": () => {
        if (getCurrentBlockContentType(this.editor) !== "inline*") {
          return true;
        }

        return this.editor.commands.BNUpdateBlock(
          this.editor.state.selection.anchor,
          {
            type: "checkListItem",
            props: {},
          }
        );
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]", // TODO: remove if we can't come up with test case that needs this
      },
      // Checkbox only.
      {
        tag: "input",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if ((element as HTMLInputElement).type === "checkbox") {
            return { checked: (element as HTMLInputElement).checked };
          }

          return false;
        },
        node: "checkListItem",
      },
      // Container element for checkbox + label.
      {
        tag: "li",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (
            parent.tagName === "UL" ||
            (parent.tagName === "DIV" && parent.parentElement!.tagName === "UL")
          ) {
            const checkbox =
              (element.querySelector(
                "input[type=checkbox]"
              ) as HTMLInputElement) || null;

            if (checkbox === null) {
              return false;
            }

            return { checked: checkbox.checked };
          }

          return false;
        },
        node: "checkListItem",
      },
    ];
  },

  // Since there is no HTML checklist element, there isn't really any
  // standardization for what checklists should look like in the DOM. GDocs'
  // and Notion's aren't cross compatible, for example. This implementation
  // has a semantically correct DOM structure (though missing a label for the
  // checkbox) which is also converted correctly to Markdown by remark.
  renderHTML({ node, HTMLAttributes }) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = node.attrs.checked;
    if (node.attrs.checked) {
      checkbox.setAttribute("checked", "");
    }

    const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
      this.name,
      "p",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );

    dom.insertBefore(checkbox, contentDOM);

    return { dom, contentDOM };
  },

  // Need to render node view since the checkbox needs to be able to update the
  // node. This is only possible with a node view as it exposes `getPos`.
  addNodeView() {
    return ({ node, getPos, editor, HTMLAttributes }) => {
      // Need to wrap certain elements in a div or keyboard navigation gets
      // confused.
      const wrapper = document.createElement("div");
      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.contentEditable = "false";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = node.attrs.checked;
      if (node.attrs.checked) {
        checkbox.setAttribute("checked", "");
      }

      const changeHandler = () => {
        if (!editor.isEditable) {
          // This seems like the most effective way of blocking the checkbox
          // from being toggled, as event.preventDefault() does not stop it for
          // "click" or "change" events.
          checkbox.checked = !checkbox.checked;
          return;
        }

        if (typeof getPos !== "boolean") {
          this.editor.commands.BNUpdateBlock(getPos(), {
            type: "checkListItem",
            props: {
              checked: checkbox.checked as any,
            },
          });
        }
      };
      checkbox.addEventListener("change", changeHandler);

      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        "p",
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
        },
        this.options.domAttributes?.inlineContent || {}
      );

      if (typeof getPos !== "boolean") {
        // Since `node` is a blockContent node, we have to get the block ID from
        // the parent blockContainer node. This means we can't add the label in
        // `renderHTML` as we can't use `getPos` and therefore can't get the
        // parent blockContainer node.
        const blockID = this.editor.state.doc.resolve(getPos()).node().attrs.id;
        const label = "label-" + blockID;
        checkbox.setAttribute("aria-labelledby", label);
        contentDOM.id = label;
      }

      dom.removeChild(contentDOM);
      dom.appendChild(wrapper);
      wrapper.appendChild(checkboxWrapper);
      wrapper.appendChild(contentDOM);
      checkboxWrapper.appendChild(checkbox);

      return {
        dom,
        contentDOM,
        destroy: () => {
          checkbox.removeEventListener("change", changeHandler);
        },
      };
    };
  },
});

export const CheckListItem = createBlockSpecFromStronglyTypedTiptapNode(
  checkListItemBlockContent,
  checkListItemPropSchema
);
