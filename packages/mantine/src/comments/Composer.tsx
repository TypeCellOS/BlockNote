import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { Button, Flex, Paper } from "@mantine/core";
import { forwardRef } from "react";
import { BlockNoteView } from "../BlockNoteView.js";

export const Composer = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Composer"]
>((props, ref) => {
  const { className, editor, onSubmit, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <Paper
      shadow="md"
      withBorder
      p="xs"
      radius="md"
      w={350}
      className={className}
      ref={ref}>
      <BlockNoteView
        editor={props.editor}
        sideMenu={false}
        slashMenu={false}
        tableHandles={false}
        filePanel={false}
      />
      {/* TODO: extract / change to icon? */}
      <Flex justify="flex-end" direction="row">
        <Button size="xs" onClick={onSubmit}>
          Submit
        </Button>
      </Flex>
    </Paper>
  );
});
