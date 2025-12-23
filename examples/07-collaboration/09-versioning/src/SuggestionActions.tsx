import { SuggestionsExtension } from "@blocknote/core/extensions";
import { useComponentsContext, useExtension } from "@blocknote/react";
import { RiArrowGoBackLine, RiCheckLine } from "react-icons/ri";

export const SuggestionActions = () => {
  const Components = useComponentsContext()!;

  const { applyAllSuggestions, revertAllSuggestions } =
    useExtension(SuggestionsExtension);

  return (
    <Components.Generic.Toolbar.Root className={"bn-toolbar"}>
      <Components.Generic.Toolbar.Button
        label="Apply All Changes"
        icon={<RiCheckLine />}
        onClick={() => applyAllSuggestions()}
        mainTooltip="Apply All Changes"
      >
        {/* Apply All Changes */}
      </Components.Generic.Toolbar.Button>
      <Components.Generic.Toolbar.Button
        label="Revert All Changes"
        icon={<RiArrowGoBackLine />}
        onClick={() => revertAllSuggestions()}
        mainTooltip="Revert All Changes"
      >
        {/* Revert All Changes */}
      </Components.Generic.Toolbar.Button>
    </Components.Generic.Toolbar.Root>
  );
};
