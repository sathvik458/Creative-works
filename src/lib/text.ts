/** "1 word", "3 words". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Adds a full stop unless the text already ends with punctuation ("Which exit?" stays as is). */
export function withStop(text: string): string {
  return /[.!?。！？…]$/.test(text.trim()) ? text : `${text}.`;
}
