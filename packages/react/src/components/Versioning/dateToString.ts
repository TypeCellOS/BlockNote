export const dateToString = (date: Date) =>
  `${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}, ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
