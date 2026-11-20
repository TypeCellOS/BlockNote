import { sourceContent, type SourceBlock } from "../exporters/sourceContent.js";

function sourceBlockMapping(block: SourceBlock) {
  const { label, description, source, href } = sourceContent(block);
  return (
    <Section>
      <Text>{href ? <Link href={href}>{label}</Link> : label}</Text>
      {description && <Text>{description}</Text>}
      {source && source !== label && (
        <Text>{href ? <Link href={href}>{source}</Link> : source}</Text>
      )}
    </Section>
  );
}

export {
  sourceBlockMapping as bookmarkBlockMapping,
  sourceBlockMapping as embedBlockMapping,
};
import { Link, Section, Text } from "@react-email/components";
