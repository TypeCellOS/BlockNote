export function suffixIDs<T>(source: Array<T>): Array<T> {
  return source.map((el) => {
    if (typeof el === "object" && el && "id" in el) {
      return {
        ...el,
        id: `${el.id}$`,
      };
    }
    return el;
  });
}
