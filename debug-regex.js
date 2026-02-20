function parseElements(tsx) {
  const elements = [];
  const pattern = /<([A-Z][a-zA-Z0-9]*)\s*([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let match;
  while ((match = pattern.exec(tsx)) !== null) {
    const attributes = match[2];
    console.log("Matched tag:", match[1]);
    console.log("Attributes:", JSON.stringify(attributes));

    const idMatch = attributes.match(/id=(["'])(.*?)\1/);
    console.log("ID Match:", idMatch ? idMatch[2] : "null");

    elements.push({
      content: match[0],
      id: idMatch ? idMatch[2] : null,
    });
  }
  return elements;
}

const input = `<Paragraph textAlignment="left">New block</Paragraph>
<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`;

console.log("Input length:", input.length);
const results = parseElements(input);
console.log("Results:", JSON.stringify(results, null, 2));
