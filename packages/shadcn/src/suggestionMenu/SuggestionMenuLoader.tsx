import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";

export const SuggestionMenuLoader = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Loader"]
>((props, ref) => {
  const { className, ...rest } = props;

  assertEmpty(rest);

  return (
    <div className={cn(className, "bn-animate-spin")} ref={ref}>
      {/* Taken from Google Material Icons */}
      {/* https://fonts.google.com/icons?selected=Material+Symbols+Rounded:progress_activity:FILL@0;wght@400;GRAD@0;opsz@24&icon.query=load&icon.size=24&icon.color=%23e8eaed&icon.set=Material+Symbols&icon.style=Rounded&icon.platform=web */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="1em"
        viewBox="0 -960 960 960"
        width="1em"
        fill="#e8eaed">
        <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
      </svg>
    </div>
  );
});
