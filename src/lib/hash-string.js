// Lovingly copied from https://github.com/refined-github/refined-github/blob/main/source/helpers/hash-string.ts
export default function hashString(string) {
  let hash = 0;

  for (const character of string) {
    hash = (hash << 5) - hash + character.codePointAt(0);
  }

  return String(Math.trunc(hash));
}
