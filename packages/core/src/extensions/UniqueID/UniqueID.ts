import {
  combineTransactionSteps,
  Extension,
  findChildren,
  findChildrenInRange,
  getChangedRanges,
} from "@tiptap/core";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { v4 } from "uuid";

/**
 * Code from Tiptap UniqueID extension (https://tiptap.dev/api/extensions/unique-id)
 * This extension is licensed under MIT (even though it's part of Tiptap pro).
 *
 * If you're a user of BlockNote, we still recommend to support their awesome work and become a sponsor!
 * https://tiptap.dev/pro
 */

/**
 * Removes duplicated values within an array.
 * Supports numbers, strings and objects.
 */
function removeDuplicates(array: any, by = JSON.stringify) {
  const seen: any = {};
  return array.filter((item: any) => {
    const key = by(item);
    return Object.prototype.hasOwnProperty.call(seen, key)
      ? false
      : (seen[key] = true);
  });
}

/**
 * Returns a list of duplicated items within an array.
 */
function findDuplicates(items: any) {
  const filtered = items.filter(
    (el: any, index: number) => items.indexOf(el) !== index
  );
  const duplicates = removeDuplicates(filtered);
  return duplicates;
}

const UniqueID = Extension.create({
  name: "uniqueID",
  // we’ll set a very high priority to make sure this runs first
  // and is compatible with `appendTransaction` hooks of other extensions
  priority: 10000,
  addOptions() {
    return {
      attributeName: "id",
      types: [],
      generateID: () => {
        // Use mock ID if tests are running.
        if ((window as any).__TEST_OPTIONS) {
          if ((window as any).__TEST_OPTIONS.mockID === undefined) {
            (window as any).__TEST_OPTIONS.mockID = 0;
          } else {
            (window as any).__TEST_OPTIONS.mockID++;
          }

          return (window as any).__TEST_OPTIONS.mockID.toString() as string;
        }

        return v4();
      },
      filterTransaction: null,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute(`data-${this.options.attributeName}`),
            renderHTML: (attributes) => ({
              [`data-${this.options.attributeName}`]:
                attributes[this.options.attributeName],
            }),
          },
        },
      },
    ];
  },
  // check initial content for missing ids
  onCreate() {
    // Don’t do this when the collaboration extension is active
    // because this may update the content, so Y.js tries to merge these changes.
    // This leads to empty block nodes.
    // See: https://github.com/ueberdosis/tiptap/issues/2400
    if (
      this.editor.extensionManager.extensions.find(
        (extension) => extension.name === "collaboration"
      )
    ) {
      return;
    }
    const { view, state } = this.editor;
    const { tr, doc } = state;
    const { types, attributeName, generateID } = this.options;
    const nodesWithoutId = findChildren(doc, (node) => {
      return (
        types.includes(node.type.name) && node.attrs[attributeName] === null
      );
    });
    nodesWithoutId.forEach(({ node, pos }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        [attributeName]: generateID(),
      });
    });
    tr.setMeta("addToHistory", false);
    view.dispatch(tr);
  },
  addProseMirrorPlugins() {
    let dragSourceElement: any = null;
    let transformPasted = false;
    return [
      new Plugin({
        key: new PluginKey("uniqueID"),
        appendTransaction: (transactions, oldState, newState) => {
          // console.log("appendTransaction");
          const docChanges =
            transactions.some((transaction) => transaction.docChanged) &&
            !oldState.doc.eq(newState.doc);
          const filterTransactions =
            this.options.filterTransaction &&
            transactions.some((tr) => {
              var _a, _b;
              return !((_b = (_a = this.options).filterTransaction) === null ||
              _b === void 0
                ? void 0
                : _b.call(_a, tr));
            });
          if (!docChanges || filterTransactions) {
            return;
          }
          const { tr } = newState;
          const { types, attributeName, generateID } = this.options;
          const transform = combineTransactionSteps(
            oldState.doc,
            transactions as any
          );
          const { mapping } = transform;
          // get changed ranges based on the old state
          const changes = getChangedRanges(transform);

          changes.forEach(({ newRange }) => {
            const newNodes = findChildrenInRange(
              newState.doc,
              newRange,
              (node) => {
                return types.includes(node.type.name);
              }
            );
            const newIds = newNodes
              .map(({ node }) => node.attrs[attributeName])
              .filter((id) => id !== null);
            const duplicatedNewIds = findDuplicates(newIds);
            newNodes.forEach(({ node, pos }) => {
              var _a;
              // instead of checking `node.attrs[attributeName]` directly
              // we look at the current state of the node within `tr.doc`.
              // this helps to prevent adding new ids to the same node
              // if the node changed multiple times within one transaction
              const id =
                (_a = tr.doc.nodeAt(pos)) === null || _a === void 0
                  ? void 0
                  : _a.attrs[attributeName];
              if (id === null) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  [attributeName]: generateID(),
                });
                return;
              }
              // check if the node doesn’t exist in the old state
              const { deleted } = mapping.invert().mapResult(pos);
              const newNode = deleted && duplicatedNewIds.includes(id);
              if (newNode) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  [attributeName]: generateID(),
                });
              }
            });
          });
          if (!tr.steps.length) {
            return;
          }
          return tr;
        },
        // we register a global drag handler to track the current drag source element
        view(view) {
          const handleDragstart = (event: any) => {
            var _a;
            dragSourceElement = (
              (_a = view.dom.parentElement) === null || _a === void 0
                ? void 0
                : _a.contains(event.target)
            )
              ? view.dom.parentElement
              : null;
          };
          window.addEventListener("dragstart", handleDragstart);
          return {
            destroy() {
              window.removeEventListener("dragstart", handleDragstart);
            },
          };
        },
        props: {
          // `handleDOMEvents` is called before `transformPasted`
          // so we can do some checks before
          handleDOMEvents: {
            // only create new ids for dropped content while holding `alt`
            // or content is dragged from another editor
            drop: (view, event: any) => {
              var _a;
              if (
                dragSourceElement !== view.dom.parentElement ||
                ((_a = event.dataTransfer) === null || _a === void 0
                  ? void 0
                  : _a.effectAllowed) === "copy"
              ) {
                dragSourceElement = null;
                transformPasted = true;
              }
              return false;
            },
            // always create new ids on pasted content
            paste: () => {
              transformPasted = true;
              return false;
            },
          },
          // we’ll remove ids for every pasted node
          // so we can create a new one within `appendTransaction`
          transformPasted: (slice) => {
            if (!transformPasted) {
              return slice;
            }
            const { types, attributeName } = this.options;
            const removeId = (fragment: any) => {
              const list: any[] = [];
              fragment.forEach((node: any) => {
                // don’t touch text nodes
                if (node.isText) {
                  list.push(node);
                  return;
                }
                // check for any other child nodes
                if (!types.includes(node.type.name)) {
                  list.push(node.copy(removeId(node.content)));
                  return;
                }
                // remove id
                const nodeWithoutId = node.type.create(
                  {
                    ...node.attrs,
                    [attributeName]: null,
                  },
                  removeId(node.content),
                  node.marks
                );
                list.push(nodeWithoutId);
              });
              return Fragment.from(list);
            };
            // reset check
            transformPasted = false;
            return new Slice(
              removeId(slice.content),
              slice.openStart,
              slice.openEnd
            );
          },
        },
      }),
    ];
  },
});

export { UniqueID, UniqueID as default };
//# sourceMappingURL=tiptap-extension-unique-id.esm.js.map
