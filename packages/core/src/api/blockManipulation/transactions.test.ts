// import { describe, expect, it } from "vitest";

// import { setupTestEnv } from "./setupTestEnv.js";
// import { Transaction } from "prosemirror-state";

// const getEditor = setupTestEnv();

// describe("Test blocknote transactions", () => {
//   it("should return the correct block info when not in a transaction", async () => {
//     const editor = getEditor();
//     editor.removeBlocks(editor.document);

//     const tr = editor.transaction;
//     const nodeToInsert = {
//       type: "blockContainer",
//       attrs: {
//         // Intentionally missing id
//         // id: "1",
//         textColor: "default",
//         backgroundColor: "default",
//       },
//       content: [
//         {
//           type: "paragraph",
//           attrs: {
//             textAlignment: "left",
//           },
//           content: [
//             {
//               type: "text",
//               text: "Hey-yo",
//             },
//           ],
//         },
//       ],
//     };

//     tr.insert(1, editor.pmSchema.nodeFromJSON(nodeToInsert));
//     await expect(tr.doc.toJSON()).toMatchFileSnapshot("transaction-doc.json");

//     editor.dispatch(tr);

//     expect(editor.transaction.doc.toJSON()).toMatchFileSnapshot(
//       "editor-doc.json"
//     );
//   });

//   it.skip("should return the correct block info", async () => {
//     const editor = getEditor();
//     editor.removeBlocks(editor.document);

//     let tr = undefined as unknown as Transaction;

//     editor.transact(() => {
//       tr = editor.transaction;
//       const nodeToInsert = {
//         type: "blockContainer",
//         attrs: {
//           // Intentionally missing id
//           // id: "1",
//           textColor: "default",
//           backgroundColor: "default",
//         },
//         content: [
//           {
//             type: "paragraph",
//             attrs: {
//               textAlignment: "left",
//             },
//             content: [
//               {
//                 type: "text",
//                 text: "Hey-yo",
//               },
//             ],
//           },
//         ],
//       };

//       tr.insert(1, editor.pmSchema.nodeFromJSON(nodeToInsert));
//       expect(tr.doc.toJSON()).toMatchFileSnapshot("transaction-doc.json");

//       editor.dispatch(tr);
//       expect(editor.transaction.doc.toJSON()).toMatchFileSnapshot(
//         "editor-doc.json"
//       );
//     });
//   });
// });
