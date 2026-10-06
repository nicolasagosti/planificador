// Spanish lists and number agreement.

// "y" becomes "e" before an "i" sound: "Facebook e Instagram", but
// "y hielo" (a diphthong keeps "y").
function conjunctionBefore(word: string): "y" | "e" {
  return /^h?[ií](?![aeiouáéíóú])/i.test(word.trim()) ? "e" : "y";
}

/** "a", "a y b", "a, b y c". */
export function joinWithAnd(items: readonly string[]): string {
  const last = items.at(-1);
  if (last === undefined) return "";
  if (items.length === 1) return last;
  const head = items.slice(0, -1).join(", ");
  return `${head} ${conjunctionBefore(last)} ${last}`;
}

/** "1 pieza", "3 piezas". */
export function counted(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
