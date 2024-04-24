import * as ShadCNCard from "../components/ui/card";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const SuggestionMenu = forwardRef<
  HTMLDivElement,
  ComponentProps["SuggestionMenu"]["Root"]
>((props, ref) => {
  const { className, children } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Card = ShadCNComponents?.Card || ShadCNCard.Card;
  const CardContent = ShadCNComponents?.CardContent || ShadCNCard.CardContent;

  return (
    <Card className={cn("overflow-auto p-1", className)} ref={ref}>
      <CardContent className={"p-0"}>{children}</CardContent>
    </Card>
  );
});
