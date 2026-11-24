/**
 * A space, a tab or a newline ends the destination of a link or an image.
 * Thus, a destination with one of these characters goes in angle brackets
 * (`<my file.png>`), as in CommonMark. Without the brackets, the markdown
 * parser cuts the URL at that character.
 */
export function formatLinkDestination(destination: string): string {
  // The characters at which `parseDestinationAndTitle` of the markdown parser
  // ends a destination. Other white space, such as a no-break space, is a
  // part of the URL there.
  return /[ \t\n]/.test(destination) ? `<${destination}>` : destination;
}
