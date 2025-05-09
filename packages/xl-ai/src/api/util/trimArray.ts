export function trimArray<T>(
  arr: T[],
  matchFn: (element: T) => boolean,
  trimStart = true,
  trimEnd = true
): T[] {
  let start = 0;
  let end = arr.length;

  // Find the first non-matching element from the start
  if (trimStart) {
    while (start < end && matchFn(arr[start])) {
      start++;
    }
  }

  // Find the first non-matching element from the end
  if (trimEnd) {
    while (end > start && matchFn(arr[end - 1])) {
      end--;
    }
  }

  // Slice the array to include only the untrimmed portion
  return arr.slice(start, end);
}
