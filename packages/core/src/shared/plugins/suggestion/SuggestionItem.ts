export type SuggestionItem = {
  name: string;
  match: (query: string) => boolean;
};
