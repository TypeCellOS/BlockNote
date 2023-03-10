/**
 * A generic interface used in all suggestion menus (slash menu, mentions, etc)
 */
export class SuggestionItem {
  constructor(public name: string, public match: (query: string) => boolean) {}
}
