import {
  SuggestionMenuItem,
  SuggestionMenuItemProps,
} from "./SuggestionMenuItem";
import {
  SuggestionMenuLabel,
  SuggestionMenuLabelProps,
} from "./SuggestionMenuLabel";
import { SuggestionMenu } from "./SuggestionMenu";

export type SuggestionMenuItemsProps = {
  items: (SuggestionMenuItemProps | SuggestionMenuLabelProps)[];
  loadingState?: "initial" | "loading-initial" | "loading" | "loaded";
  selectedIndex?: number;
};

export function DefaultRenderItems(props: SuggestionMenuItemsProps) {
  let numLabels = 0;

  return (
    <SuggestionMenu loadingState={props.loadingState}>
      {props.items.map((item, index) => {
        if ("label" in item) {
          numLabels++;
          return <SuggestionMenuLabel {...item} key={item.label} />;
        } else {
          return (
            <SuggestionMenuItem
              {...item}
              isSelected={props.selectedIndex === index - numLabels}
              key={item.text}
            />
          );
        }
      })}
    </SuggestionMenu>
  );
}
