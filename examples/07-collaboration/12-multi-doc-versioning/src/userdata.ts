export type DemoUser = {
  id: string;
  name: string;
  color: string;
  colorLight: string;
};

export const USERS: DemoUser[] = [
  {
    id: "alice",
    name: "Alice",
    color: "#30bced",
    colorLight: "#30bced33",
  },
  {
    id: "bob",
    name: "Bob",
    color: "#6eeb83",
    colorLight: "#6eeb8333",
  },
  {
    id: "charlie",
    name: "Charlie",
    color: "#ffbc42",
    colorLight: "#ffbc4233",
  },
  {
    id: "dana",
    name: "Dana",
    color: "#ee6352",
    colorLight: "#ee635233",
  },
];
