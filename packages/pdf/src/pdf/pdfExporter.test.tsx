import ReactPDF, {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { describe, it } from "vitest";
import { testDocument } from "../testDocument";
import { createPdfExporterForDefaultSchema } from "./pdfExporter";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = createPdfExporterForDefaultSchema();
    const ps = exporter.transform(testDocument);

    const styles = StyleSheet.create({
      page: {
        fontFamily: "Inter",
        fontSize: 12,
        lineHeight: 1.5,
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
          {/* <View>

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

            <Text>Section #3</Text>
            <Text>Section #4</Text>
          </View> */}
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
