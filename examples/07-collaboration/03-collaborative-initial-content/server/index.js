import express from "express";
import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { fromUint8Array } from "js-base64";
import * as Y from "yjs";
import { LoremIpsum } from "lorem-ipsum";

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 8,
    min: 4,
  },
  wordsPerSentence: {
    max: 16,
    min: 4,
  },
});

const app = express();
const port = 8080;
const editor = ServerBlockNoteEditor.create();

app.get("/", async (req, res) => {
  const doc = await editor.blocksToYDoc(
    [
      {
        id: "7d181c92-fd43-405a-9760-d7feff142917",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: lorem.generateSentences(2),
            styles: {},
          },
        ],
        children: [],
      },
    ],
    "document-store"
  );

  // https://docs.yjs.dev/api/document-updates encode the state as a vector which we can later apply in the frontend
  const state = Y.encodeStateAsUpdateV2(doc);
  const initialContent = fromUint8Array(state);
  res.send(initialContent);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
