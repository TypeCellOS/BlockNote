const ID_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

export const generateRandomId = (length: number): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < bytes.length; i++) {
    id += ID_CHARS[bytes[i] % ID_CHARS.length];
  }
  return id;
};

const DOC_ADJECTIVES = [
  "Quiet",
  "Bright",
  "Gentle",
  "Curious",
  "Tangled",
  "Shimmering",
  "Restless",
  "Polished",
  "Folded",
  "Loose",
  "Scattered",
  "Hidden",
  "Patient",
  "Stubborn",
  "Winding",
  "Borrowed",
  "Plain",
  "Dusty",
  "Silver",
  "Wild",
  "Half",
  "Unfinished",
  "Morning",
  "Midnight",
  "Parallel",
  "Open",
  "Stray",
  "Sunlit",
  "Crooked",
  "Spare",
];

const DOC_NOUNS = [
  "Draft",
  "Notebook",
  "Sketch",
  "Memo",
  "Chapter",
  "Outline",
  "Margin",
  "Thought",
  "Idea",
  "Plan",
  "Passage",
  "Letter",
  "Log",
  "Journal",
  "Scrap",
  "Leaf",
  "Manuscript",
  "Record",
  "Fragment",
  "Brief",
  "Entry",
  "Column",
  "Folder",
  "Canvas",
  "Report",
  "Section",
  "Page",
  "Transcript",
  "Ledger",
  "Dossier",
];

export const generateDocTitle = (): string => {
  const adj = DOC_ADJECTIVES[Math.floor(Math.random() * DOC_ADJECTIVES.length)];
  const noun = DOC_NOUNS[Math.floor(Math.random() * DOC_NOUNS.length)];
  return adj + " " + noun;
};

export const formatRelative = (
  ts: number,
  { justNowMs = 60_000 } = {},
): string => {
  if (!ts) {
    return "";
  }
  const diff = Date.now() - ts;
  if (diff < justNowMs) {
    return "just now";
  }
  if (diff < 3_600_000) {
    return Math.floor(diff / 60_000) + "m ago";
  }
  if (diff < 86_400_000) {
    return Math.floor(diff / 3_600_000) + "h ago";
  }
  if (diff < 7 * 86_400_000) {
    return Math.floor(diff / 86_400_000) + "d ago";
  }
  return new Date(ts).toLocaleDateString();
};
