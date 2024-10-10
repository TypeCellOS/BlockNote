import {
  BlockNoteSchema,
  partialBlocksToBlocksForTesting,
} from "@blocknote/core";

import ReactPDF, {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { describe, it } from "vitest";
import { createDocxExporterForDefaultSchema } from "./pdfExporter";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = createDocxExporterForDefaultSchema();
    const ps = exporter.transform(
      partialBlocksToBlocksForTesting(BlockNoteSchema.create().blockSchema, [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Welcome to this demo!",
              styles: {
                italic: true,
              },
            },
          ],
          children: [
            {
              type: "paragraph",
              content: "Hello World",
            },
          ],
        },

        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Blocks:",
              styles: { bold: true },
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        {
          type: "heading",
          content: "Heading",
        },
        {
          type: "paragraph",
          content: "Paragraph",
        },
        // {
        //   type: "bulletListItem",
        //   content: "Bullet List Item",
        // },
        // {
        //   type: "numberedListItem",
        //   content: "Numbered List Item",
        // },
        // {
        //   type: "checkListItem",
        //   content: "Check List Item",
        // },
        // {
        //   type: "table",
        //   content: {
        //     type: "tableContent",
        //     rows: [
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //       {
        //         cells: ["Table Cell", "Table Cell", "Table Cell"],
        //       },
        //     ],
        //   },
        // },
        // {
        //   type: "file",
        // },
        // {
        //   type: "image",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        //   },
        // },
        // {
        //   type: "video",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        //   },
        // },
        // {
        //   type: "audio",
        //   props: {
        //     url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //     caption:
        //       "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        //   },
        // },
        // {
        //   type: "paragraph",
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Inline Content:",
        //       styles: { bold: true },
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        //   content: [
        //     {
        //       type: "text",
        //       text: "Styled Text",
        //       styles: {
        //         bold: true,
        //         italic: true,
        //         textColor: "red",
        //         backgroundColor: "blue",
        //       },
        //     },
        //     {
        //       type: "text",
        //       text: " ",
        //       styles: {},
        //     },
        //     {
        //       type: "link",
        //       content: "Link",
        //       href: "https://www.blocknotejs.org",
        //     },
        //   ],
        // },
        // {
        //   type: "paragraph",
        // },
      ])
    );
    let x = (
      <Text>
        <Text>sdfds #1</Text>
      </Text>
    );
    // console.log(ps);
    // console.log(x);

    const styles = StyleSheet.create({
      page: {
        fontFamily: "Inter",
        // flexDirection: "row",
        // backgroundColor: "#E4E4E4",
      },
      section: {
        margin: 10,
        padding: 10,
        // flexGrow: 1,
      },
    });

    const MyDocument = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>{ps}</View>
          <View>
            {/* {...ps} */}
            <Text>hello world no font set</Text>
            <Text
              style={{
                fontFamily: "Inter",
                // fontWeight: "bold",
                // fontStyle: "italic",
              }}>
              hello world
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "bold",
                // fontStyle: "italic",
              }}>
              hello world bold
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontStyle: "italic",
              }}>
              hello world italic
            </Text>

            <Text>Section #1</Text>
            <Text>Section #2</Text>
          </View>
          <View>
            {/* {...ps} */}
            <Text>Section #3</Text>
            <Text>Section #4</Text>
          </View>
        </Page>
      </Document>
    );

    if (import.meta.env.NODE_ENV === "test") {
      let font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Regular.ttf");
      Font.register({
        family: "Inter",
        src: font,
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Italic.ttf");
      Font.register({
        family: "Inter",
        fontStyle: "italic",
        src: font,
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-Bold.ttf");
      Font.register({
        family: "Inter",
        src: font,
        fontWeight: "bold",
      });

      font = loadFontDataUrl("./src/fonts/inter/Inter_18pt-BoldItalic.ttf");
      Font.register({
        family: "Inter",
        fontStyle: "italic",
        src: font,
        fontWeight: "bold",
      });
    } else {
      console.error("TODO");
      // const url = new URL("/types/" + typePath + "/" + path, import.meta.url);
      // // console.log("RESOLVE", mod, url.toString(), path);
      // content = await getCachedDTSString(config, url.toString());
      // // content = await (await config.fetcher(url.toString())).text();
    }

    await ReactPDF.render(<MyDocument />, `${__dirname}/example.pdf`);

    // Create styles

    // Create Document Component
    const MyDocument2 = () => (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text>Section #1</Text>
          </View>
          <View style={styles.section}>
            <Text>Section #2</Text>
          </View>
        </Page>
      </Document>
    );

    await ReactPDF.render(<MyDocument2 />, `${__dirname}/example2.pdf`);
    // await saveTestFile();
  });
});
function loadFontDataUrl(path: string) {
  // @ts-ignore
  const fs = require("fs");
  const buffer = fs.readFileSync(path);
  const fontBase64 = buffer.toString("base64");

  const dataUrl = `data:font/ttf;base64,${fontBase64}`;
  return dataUrl;
}
