import { Link, Text, View } from "@react-pdf/renderer";
import { sourceContent, type SourceBlock } from "../exporters/sourceContent.js";

/** Legacy @blocknote/xl-pdf-exporter/react-pdf only; current PDF uses /typst-exporter. */
function sourceBlockMapping(block: SourceBlock) {
  const { label, description, source, href } = sourceContent(block);
  return (
    <View>
      <Text>{href ? <Link href={href}>{label}</Link> : label}</Text>
      {description && <Text>{description}</Text>}
      {source && source !== label && (
        <Text>{href ? <Link href={href}>{source}</Link> : source}</Text>
      )}
    </View>
  );
}

export {
  sourceBlockMapping as bookmarkBlockMapping,
  sourceBlockMapping as embedBlockMapping,
};
