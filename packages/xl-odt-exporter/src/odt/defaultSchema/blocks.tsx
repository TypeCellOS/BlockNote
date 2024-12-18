import { BlockMapping, DefaultBlockSchema } from "@blocknote/core";
import {
  DrawFrame,
  DrawImage,
  Table,
  TableCell,
  TableRow,
  TextH,
  TextList,
  TextListItem,
  TextP,
  TextSpan,
} from "../util/components.js";

export const odtBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema,
  any,
  any,
  React.ReactNode,
  React.ReactNode
> = {
  paragraph: (block, exporter) => (
    <TextP>{exporter.transformInlineContent(block.content)}</TextP>
  ),

  heading: (block, exporter) => (
    <TextH
      level={block.props.level}
      style:style-name={`Heading${block.props.level}`}>
      {exporter.transformInlineContent(block.content)}
    </TextH>
  ),

  bulletListItem: (block, exporter) => (
    <TextList text:style-name="List_1">
      <TextListItem>
        <TextP>{exporter.transformInlineContent(block.content)}</TextP>
      </TextListItem>
    </TextList>
  ),

  numberedListItem: (block, exporter) => (
    <TextList text:style-name="Numbering_1">
      <TextListItem>
        <TextP>{exporter.transformInlineContent(block.content)}</TextP>
      </TextListItem>
    </TextList>
  ),

  checkListItem: (block, exporter) => (
    <TextP>
      <TextSpan>{block.props.checked ? "☒" : "☐"}</TextSpan>
      {exporter.transformInlineContent(block.content)}
    </TextP>
  ),

  image: async (block, exporter) => {
    await exporter.resolveFile(block.props.url);
    return (
      <DrawFrame>
        <DrawImage href={`Pictures/${block.props.url}`} />
      </DrawFrame>
    );
  },

  table: (block, exporter) => (
    <Table>
      {block.content.rows.map((row) => (
        <TableRow>
          {row.cells.map((cell) => (
            <TableCell>
              <TextP>{exporter.transformInlineContent(cell)}</TextP>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Table>
  ),

  codeBlock: (block, exporter) => (
    <TextP>
      <TextSpan style:style-name="Preformatted_20_Text">
        {exporter.transformInlineContent(block.content)}
      </TextSpan>
    </TextP>
  ),

  file: async (block, exporter) => {
    return <TextP>Not implemented</TextP>;
  },

  video: (block) => (
    <TextP>
      <TextSpan>[Video: {block.props.url}]</TextSpan>
    </TextP>
  ),

  audio: (block) => (
    <TextP>
      <TextSpan>[Audio: {block.props.url}]</TextSpan>
    </TextP>
  ),
};
