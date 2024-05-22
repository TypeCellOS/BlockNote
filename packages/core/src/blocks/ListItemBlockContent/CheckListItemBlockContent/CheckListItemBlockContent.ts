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
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => element.getAttribute("data-checked") === "true",
        renderHTML: (attributes) => {
          return {
            "data-checked": (attributes.checked as boolean).toString(),
          };
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
        tag: "*",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const children = element.children;

          if (children.length === 0) {
            return false;
          }

          for (let i = 0; i < children.length; i++) {
            if (
              children[i].tagName === "INPUT" &&
              (children[i] as HTMLInputElement).type === "checkbox"
            ) {
              return { checked: (children[i] as HTMLInputElement).checked };
            }
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
    dom.appendChild(contentDOM);

    return { dom, contentDOM };
  },

  // Need to render node view since the checkbox needs to be able to update the
  // node. This is only possible with a node view as it exposes `getPos`.
  addNodeView() {
    return ({ node, getPos, HTMLAttributes }) => {
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
      checkbox.addEventListener("change", () => {
        if (typeof getPos === "boolean") {
          return;
        }

        this.editor.commands.BNUpdateBlock(getPos(), {
          type: "checkListItem",
          props: {
            checked: checkbox.checked as any,
          },
        });
      });

      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        "p",
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
        },
        this.options.domAttributes?.inlineContent || {}
      );

      dom.removeChild(contentDOM);
      dom.appendChild(wrapper);
      wrapper.appendChild(checkboxWrapper);
      wrapper.appendChild(contentDOM);
      checkboxWrapper.appendChild(checkbox);

      return { dom, contentDOM };
    };
  },
});

export const CheckListItem = createBlockSpecFromStronglyTypedTiptapNode(
  checkListItemBlockContent,
  checkListItemPropSchema
);
